/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    // d3
    import Selection = d3.Selection;
    import UpdateSelection = d3.selection.Update;

    // powerbi.extensibility.utils.interactivity
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;

    export interface SampleSlicerBehaviorOptions {
        slicerItemContainers: Selection<SelectableDataPoint>;
        dataPoints: SampleSlicerDataPoint[];
        interactivityService: IInteractivityService;
        slicerSettings: SampleSlicerSettings;
        isSelectionLoaded: boolean;
    }

    export class SampleSlicerWebBehavior implements IInteractiveBehavior {
        private slicers: Selection<SelectableDataPoint>;
        private interactivityService: IInteractivityService;
        private slicerSettings: SampleSlicerSettings;
        private options: SampleSlicerBehaviorOptions;
        private selectionHandler: ISelectionHandler;

        /**
         * Public for testability.
         */
        public dataPoints: SampleSlicerDataPoint[];

        public bindEvents(options: SampleSlicerBehaviorOptions, selectionHandler: ISelectionHandler): void {
            const slicers: Selection<SelectableDataPoint> = this.slicers = options.slicerItemContainers

            this.dataPoints = options.dataPoints;
            this.interactivityService = options.interactivityService;
            this.slicerSettings = options.slicerSettings;
            this.options = options;

            this.selectionHandler = selectionHandler;

            if (!this.options.isSelectionLoaded) {
                this.restoreSelectionStateFromPersistedProperties();
            }

            slicers.on("click", (dataPoint: SampleSlicerDataPoint, index: number) => {
                (d3.event as MouseEvent).preventDefault();

                this.slicerSettings.general.clearRangeSelection();

                /* update selection state */
                selectionHandler.handleSelection(dataPoint, true /* isMultiSelect */);

                /* send selection state to the host*/
                selectionHandler.applySelectionFilter();

                /*persiste selection state to properties */
                this.persistSelectionState();
            });

        }

        public clearAllSelections() {

            /* update state to clear all selections */
            this.selectionHandler.handleClearSelection();

            /* send selection state to the host*/
            this.selectionHandler.applySelectionFilter();

            /*persiste selection state to properties */
            this.persistSelectionState();
        }


        public restoreSelectionStateFromPersistedProperties(): void {
            const savedSelectionIds: ISelectionId[] = this.slicerSettings.general.getPersistedSelectionState();

            if (savedSelectionIds.length) {

                /* clear selection state */
                this.selectionHandler.handleClearSelection();

                /* restore selection state from persisted properties */
                this.dataPoints
                    .filter(dataPoint => {
                        return savedSelectionIds.some((selectionId: ISelectionId) => {
                            return (dataPoint.identity as any).getKey() === selectionId;
                        });
                    })
                    .forEach((dataPoint: SampleSlicerDataPoint) => {
                        this.selectionHandler.handleSelection(dataPoint, true);
                    });

                /* send selection state to the host */
                this.selectionHandler.applySelectionFilter();
            } 
        }

        public persistSelectionState(): void {
            let selectedIds: ISelectionId[],
                selectionIdKeys: string[];

            selectedIds = <ISelectionId[]>(<any>this.selectionHandler).selectedIds;

            selectionIdKeys = selectedIds.map((selectionId: ISelectionId) => {
                return (selectionId as any).getKey();
            });

            this.slicerSettings.general.persistSelectionState(selectionIdKeys);
        }

        public renderSelection(hasSelection: boolean): void {
            if (!hasSelection && !this.interactivityService.isSelectionModeInverted()) {
                this.slicers.style(
                    "background",
                    this.slicerSettings.slicerText.unselectedColor);
            }
            else {
                this.styleSlicerInputs(this.slicers, hasSelection);
            }
        }

        public styleSlicerInputs(slicers: Selection<any>, hasSelection: boolean) {
            let settings = this.slicerSettings;
            slicers.each(function (dataPoint: SampleSlicerDataPoint) {
                d3.select(this).style({
                    "background": (dataPoint.selected || dataPoint.isSelectedRangePoint)
                        ? settings.slicerText.selectedColor
                        : settings.slicerText.unselectedColor
                });
            });
        }
    }
}
