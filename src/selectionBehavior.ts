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

    // powerbi.extensibility.utils.interactivity
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import IInteractiveBehavior = powerbi.extensibility.utils.interactivity.IInteractiveBehavior;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;

    export interface SampleSlicerBehaviorOptions {
        slicerItemContainers: Selection<SelectableDataPoint>;
        dataPoints: SampleSlicerDataPoint[];
        interactivityService: IInteractivityService;
        slicerSettings: Settings;
        isSelectionLoaded: boolean;
    }

    export class SelectionBehavior implements IInteractiveBehavior {
        /* discrete selection model*/
        private selectionHandler: ISelectionHandler;
        /* range selection model*/
        public scalableRange: ScalableRange;

        private slicers: Selection<SelectableDataPoint>;
        private interactivityService: IInteractivityService;
        private slicerSettings: Settings;
        private options: SampleSlicerBehaviorOptions;
        private dataPoints: SampleSlicerDataPoint[];
        private callbacks: SampleSlicerCallbacks;

        constructor(callbacks: SampleSlicerCallbacks) {
            this.scalableRange = new ScalableRange();
            this.callbacks = callbacks;
        }


        /**
            Implementation of IInteractiveBehavior i/f
        */
        public bindEvents(options: SampleSlicerBehaviorOptions, selectionHandler: ISelectionHandler): void {
            const slicers: Selection<SelectableDataPoint> = this.slicers = options.slicerItemContainers;

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

                this.clearRangeSelection();

                /* update selection state */
                selectionHandler.handleSelection(dataPoint, true /* isMultiSelect */);

                /* send selection state to the host*/
                selectionHandler.applySelectionFilter();

                /*persiste selection state to properties */
                this.persistSelectionState();
            });

        }

        /**
            Implementation of IInteractiveBehavior i/f
        */
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

        public clearAllDiscreteSelections() {

            /* update state to clear all selections */
            this.selectionHandler.handleClearSelection();

            /*persiste selection state to properties */
            this.persistSelectionState();
        }

        public clearRangeSelection(): void {
            this.scalableRange = new ScalableRange();
        }


        public restoreSelectionStateFromPersistedProperties(): void {
            const savedSelectionIds: ISelectionId[] = this.callbacks.getPersistedSelectionState();

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
            } else {
                this.callbacks.restorePersistedRangeSelectionState();
            }
        }

        public persistSelectionState(): void {
            let selectedIds: ISelectionId[],
                selectionIdKeys: string[];

            selectedIds = <ISelectionId[]>(<any>this.selectionHandler).selectedIds;

            selectionIdKeys = selectedIds.map((selectionId: ISelectionId) => {
                return (selectionId as any).getKey();
            });

            this.callbacks.persistSelectionState(selectionIdKeys);
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

        public updateOnRangeSelectonChange(): void {
            this.clearAllDiscreteSelections();

            let value: ValueRange<number> = this.scalableRange.getValue();
            if (!value.min && !value.max) {
                return;
            }

            let conditions: IAdvancedFilterCondition[] = [];
            let target: IFilterColumnTarget = this.callbacks.getAdvancedFilterColumnTarget();

            if (value.min) {
                conditions.push({
                    operator: "GreaterThan",
                    value: value.min
                });
            }

            if (value.max) {
                conditions.push({
                    operator: "LessThan",
                    value: value.max
                });
            }

            let filter: IAdvancedFilter = new window['powerbi-models'].AdvancedFilter(target, "And", conditions);
            this.callbacks.applyAdvancedFilter(filter);
        }
    }
}
