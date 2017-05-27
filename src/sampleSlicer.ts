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

    // powerbi.extensibility.utils.dataview
    import DataViewObjectsModule = powerbi.extensibility.utils.dataview.DataViewObjects;

    // powerbi.extensibility.utils.type
    import PixelConverter = powerbi.extensibility.utils.type.PixelConverter;

    // powerbi.extensibility.utils.interactivity
    import SelectableDataPoint = powerbi.extensibility.utils.interactivity.SelectableDataPoint;
    import IInteractivityService = powerbi.extensibility.utils.interactivity.IInteractivityService;
    import createInteractivityService = powerbi.extensibility.utils.interactivity.createInteractivityService;
    import ISelectionHandler = powerbi.extensibility.utils.interactivity.ISelectionHandler;

    // powerbi.extensibility.utils.svg
    import IMargin = powerbi.extensibility.utils.svg.IMargin;
    import ClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.ClassAndSelector;
    import createClassAndSelector = powerbi.extensibility.utils.svg.CssConstants.createClassAndSelector;

    // powerbi.extensibility.utils.formatting
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;

    export const enum RangeValueType {
        Start,
        End
    }

    export interface SampleSlicerData {
        categorySourceName: string;
        formatString: string;
        slicerDataPoints: SampleSlicerDataPoint[];
        slicerSettings: SampleSlicerSettings;
    }

    export interface SampleSlicerDataPoint extends SelectableDataPoint {
        category?: string;
        isSelectedRangePoint?: boolean;
        filtered?: boolean;
    }

    export class SampleSlicer implements IVisual {
        private $root: JQuery;
        private $searchHeader: JQuery;
        private $searchInput: JQuery;
        private currentViewport: IViewport;
        private dataView: DataView;
        private slicerHeader: Selection<any>;


        private rangeSlicer: Selection<any>;
        private rangeSlicerHead: Selection<any>;
        private rangeSlicerControls: Selection<any>;
        private rangeSlicerSlider: Selection<any>;
        private startControl: Selection<any>;
        private endControl: Selection<any>;


        private slicerBody: Selection<any>;
        private rangeBody: Selection<any>;
        private startContainer: Selection<any>;
        private endContainer: Selection<any>;
        private $start: JQuery;
        private $end: JQuery;
        private $sliderElement: JQuery;
        private slider: noUiSlider.noUiSlider;
        private filter: IAdvancedFilter;

        private tableView: ITableView;
        private slicerData: SampleSlicerData;
        private scalableRange: ScalableRange;

        private interactivityService: IInteractivityService;
        private visualHost: IVisualHost;

        private waitingForData: boolean;
        private isSelectionLoaded: boolean;
        private isSelectionSaved: boolean;

        private behavior: SampleSlicerWebBehavior;
        private settings: SampleSlicerSettings;

        public static DefaultFontFamily: string = "helvetica, arial, sans-serif";
        public static DefaultFontSizeInPt: number = 11;

        private static СellTotalInnerPaddings: number = 8;
        private static СellTotalInnerBorders: number = 2;
        private static СhicletTotalInnerRightLeftPaddings: number = 14;

        public static MaxTransparency: number = 100;

        private static MaxCellPadding: number = 20;

        private static MinSizeOfViewport: number = 0;
        private static MinColumns: number = 1;

        private static WidthOfScrollbar: number = 17;

        public static ItemContainerSelector: ClassAndSelector = createClassAndSelector('slicerItemContainer');
        public static SlicerImgWrapperSelector: ClassAndSelector = createClassAndSelector('slicer-img-wrapper');
        public static SlicerTextWrapperSelector: ClassAndSelector = createClassAndSelector('slicer-text-wrapper');
        public static SlicerBodyHorizontalSelector: ClassAndSelector = createClassAndSelector('slicerBody-horizontal');
        public static SlicerBodyVerticalSelector: ClassAndSelector = createClassAndSelector('slicerBody-vertical');
        public static HeaderTextSelector: ClassAndSelector = createClassAndSelector('headerText');
        public static ContainerSelector: ClassAndSelector = createClassAndSelector('sampleSlicer');
        public static LabelTextSelector: ClassAndSelector = createClassAndSelector('slicerText');
        public static HeaderSelector: ClassAndSelector = createClassAndSelector('slicerHeader');
        public static InputSelector: ClassAndSelector = createClassAndSelector('slicerCheckbox');
        public static ClearSelector: ClassAndSelector = createClassAndSelector('clear');
        public static BodySelector: ClassAndSelector = createClassAndSelector('slicerBody');
        public static RangeSlicerSelector: ClassAndSelector = createClassAndSelector('date-slicer');
        public static RangeSlicerHeadSelector: ClassAndSelector = createClassAndSelector('date-slicer-head');
        public static RangeSlicerControlsSelector: ClassAndSelector = createClassAndSelector('date-slicer-range');
        public static RangeSlicerSliderSelector: ClassAndSelector = createClassAndSelector('date-slicer-slider');
        public static RangeSlicerControlSelector: ClassAndSelector = createClassAndSelector('date-slicer-control');
        public static InputClass: ClassAndSelector = createClassAndSelector('date-slicer-input');

        public static converter(
            dataView: DataView,
            searchText: string,
            scalableRange: ScalableRange,
            visualHost: IVisualHost): SampleSlicerData {

            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0] ||
                !dataView.categorical.categories[0].values ||
                !(dataView.categorical.categories[0].values.length > 0)) {
                return;
            }

            let converter: SampleSlicerConverter = new SampleSlicerConverter(dataView, visualHost);
            converter.convert(scalableRange);

            let slicerSettings: SampleSlicerSettings = defaultSettings;
            if (dataView.metadata.objects) {
                slicerSettings.general.selection = DataViewObjectsModule.getValue(dataView.metadata.objects, persistedSettingsDataViewObjectPropertyIdentifiers.general.selection, defaultSettings.general.selection);
                slicerSettings.general.rangeSelectionStart = DataViewObjectsModule.getValue(dataView.metadata.objects, persistedSettingsDataViewObjectPropertyIdentifiers.general.rangeSelectionStart, defaultSettings.general.selection);
                slicerSettings.general.rangeSelectionEnd = DataViewObjectsModule.getValue(dataView.metadata.objects, persistedSettingsDataViewObjectPropertyIdentifiers.general.rangeSelectionEnd, defaultSettings.general.selection);
            }

            if (searchText) {
                searchText = searchText.toLowerCase();
                converter.dataPoints.forEach(x => x.filtered = x.category.toLowerCase().indexOf(searchText) != 0);
            }

            let categories: DataViewCategoricalColumn = dataView.categorical.categories[0];

            let slicerData: SampleSlicerData;
            slicerData = {
                categorySourceName: categories.source.displayName,
                formatString: valueFormatter.getFormatStringByColumn(categories.source),
                slicerSettings: slicerSettings,
                slicerDataPoints: converter.dataPoints
            };

            return slicerData;
        }

        constructor(options: VisualConstructorOptions) {
            this.$root = $(options.element);

            this.visualHost = options.host;

            this.behavior = new SampleSlicerWebBehavior();
            this.interactivityService = createInteractivityService(options.host);

            this.settings = defaultSettings;

            this.scalableRange = new ScalableRange();

            Object.defineProperty(window, "pageXOffset", {
                get: function () {
                    return window.window.pageXOffset;
                }
            })

            Object.defineProperty(window, "pageYOffset", {
                get: function () {
                    return window.window.pageYOffset;
                }
            })
        }

        public update(options: VisualUpdateOptions) {
            if (!options ||
                !options.dataViews ||
                !options.dataViews[0] ||
                !options.viewport) {
                return;
            }

            //create viewport if not yet created
            if (!this.currentViewport) {
                this.currentViewport = options.viewport;
                this.initContainer();
            }

            //update dataview 
            const existingDataView = this.dataView;
            this.dataView = options.dataViews[0];

            //check if the dataView changed to determine if scrollbars need to be reset 
            let resetScrollbarPosition: boolean = true;
            if (existingDataView) {
                resetScrollbarPosition = !SampleSlicer.hasSameCategoryIdentity(existingDataView, this.dataView);
            }

            //update viewport 
            if (options.viewport.height === this.currentViewport.height
                && options.viewport.width === this.currentViewport.width) {
                this.waitingForData = false;
            }
            else {
                this.currentViewport = options.viewport;
            }

            this.updateInternal(resetScrollbarPosition);
        }

        private static hasSameCategoryIdentity(dataView1: DataView, dataView2: DataView): boolean {
            if (!dataView1 ||
                !dataView2 ||
                !dataView1.categorical ||
                !dataView2.categorical) {
                return false;
            }

            let dv1Categories: DataViewCategoricalColumn[] = dataView1.categorical.categories;
            let dv2Categories: DataViewCategoricalColumn[] = dataView2.categorical.categories;

            if (!dv1Categories ||
                !dv2Categories ||
                dv1Categories.length !== dv2Categories.length) {
                return false;
            }

            for (let i: number = 0, len: number = dv1Categories.length; i < len; i++) {
                let dv1Identity: DataViewScopeIdentity[] = (<DataViewCategoryColumn>dv1Categories[i]).identity;
                let dv2Identity: DataViewScopeIdentity[] = (<DataViewCategoryColumn>dv2Categories[i]).identity;

                let dv1Length: number = this.getLengthOptional(dv1Identity);
                if ((dv1Length < 1) || dv1Length !== this.getLengthOptional(dv2Identity)) {
                    return false;
                }

                for (let j: number = 0; j < dv1Length; j++) {
                    if (!_.isEqual(dv1Identity[j].key, dv2Identity[j].key)) {
                        return false;
                    }
                }
            }

            return true;
        }

        private static getLengthOptional(identity: DataViewScopeIdentity[]): number {
            if (identity) {
                return identity.length;
            }
            return 0;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let data: SampleSlicerData = this.slicerData;

            if (!data) {
                return [];
            }

            switch (options.objectName) {
                case 'rows':
                    return this.enumerateRows(data);
                case 'general':
                    return this.enumerateGeneral(data);
                default:
                    return [];
            }
        }

        private enumerateRows(data: SampleSlicerData): VisualObjectInstance[] {
            let slicerSettings: SampleSlicerSettings = this.settings;

            return [{
                selector: null,
                objectName: 'rows',
                properties: {
                    textSize: slicerSettings.slicerText.textSize,
                    height: slicerSettings.slicerText.height,
                    width: slicerSettings.slicerText.width,
                    transparency: slicerSettings.slicerText.transparency,
                    selectedColor: slicerSettings.slicerText.selectedColor,
                    hoverColor: slicerSettings.slicerText.hoverColor,
                    unselectedColor: slicerSettings.slicerText.unselectedColor,
                    padding: slicerSettings.slicerText.padding
                }
            }];
        }

        private enumerateGeneral(data: SampleSlicerData): VisualObjectInstance[] {
            let slicerSettings: SampleSlicerSettings = this.settings;

            return [{
                selector: null,
                objectName: 'general',
                properties: {
                    columns: slicerSettings.general.columns,
                    rows: slicerSettings.general.rows,
                    multiselect: slicerSettings.general.multiselect
                }
            }];
        }


        private updateInternal(resetScrollbarPosition: boolean) {
            //convert data to internal representation
            let data = SampleSlicer.converter(
                this.dataView,
                this.$searchInput.val(),
                this.scalableRange,
                this.visualHost);

            if (!data) {
                this.tableView.empty();

                return;
            }

            //try returning selection - return empty if error
            data.slicerSettings.general.getPersistedSelectionState = () => {
                try {
                    return JSON.parse(this.slicerData.slicerSettings.general.selection) || [];
                } catch (ex) {
                    return [];
                }
            };


            data.slicerSettings.general.persistSelectionState = (selectionIds: string[]): void => {
                this.visualHost.persistProperties(<VisualObjectInstancesToPersist>{
                    merge: [{
                        objectName: "general",
                        selector: null,
                        properties: {
                            selection: selectionIds && JSON.stringify(selectionIds) || "",
                            rangeSelectionStart: JSON.stringify(this.formatValue(this.scalableRange.getValue().min)),
                            rangeSelectionEnd: JSON.stringify(this.formatValue(this.scalableRange.getValue().max))
                        }
                    }]
                });

                this.isSelectionSaved = true;
            };

            data.slicerSettings.general.clearRangeSelection = (): void => {
                this.scalableRange = new ScalableRange();
            }

            data.slicerSettings.general.applyPersistedRangeSelectionState = (): void => {
                let rangeSelectionStart: string = JSON.parse(this.slicerData.slicerSettings.general.rangeSelectionStart);
                let rangeSelectionEnd: string = JSON.parse(this.slicerData.slicerSettings.general.rangeSelectionEnd);

                if (rangeSelectionStart) {
                    this.$start.val(rangeSelectionStart);
                    this.onRangeInputTextboxChange(rangeSelectionStart, RangeValueType.Start);
                }
                if (rangeSelectionEnd) {
                    this.$end.val(rangeSelectionEnd);
                    this.onRangeInputTextboxChange(rangeSelectionEnd, RangeValueType.End);
                }
            }

            if (this.slicerData) {
                if (this.isSelectionSaved) {
                    this.isSelectionLoaded = true;
                } else {
                    this.isSelectionLoaded = this.slicerData.slicerSettings.general.selection === data.slicerSettings.general.selection;
                }
            } else {
                this.isSelectionLoaded = false;
            }

            this.slicerData = data;
            this.settings = this.slicerData.slicerSettings;

            let height: number = this.settings.slicerText.height;

            //update tableView and render it  
            this.tableView
                .rowHeight(height)
                .columnWidth(this.settings.slicerText.width)
                .rows(this.settings.general.rows)
                .columns(this.settings.general.columns)
                .data(
                data.slicerDataPoints.filter(x => !x.filtered),
                (d: SampleSlicerDataPoint) => $.inArray(d, data.slicerDataPoints),
                resetScrollbarPosition)
                .viewport(this.getSlicerBodyViewport(this.currentViewport))
                .render();

            this.updateSliderControl();
            this.updateSliderInputTextboxes();
        }


        public createInputElement(control: JQuery): JQuery {
            let $element: JQuery = $('<input type="text"/>')
                .attr("type", "text")
                .addClass(SampleSlicer.InputClass.class)
                .appendTo(control);
            return $element;
        }

        private initContainer() {
            let settings: SampleSlicerSettings = this.settings,
                slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);


            //Prevents visual container from doing any other actions on keypress. 
            this.$root.on('keyup keydown', (event: JQueryEventObject) => {
                event.stopPropagation();
            });

            this.rangeSlicer = d3.select(this.$root.get(0))
                .append('div')
                .classed(SampleSlicer.RangeSlicerSelector.class, true)
                .style({
                    'background': '#ffffff'
                });

            this.slicerHeader = this.rangeSlicer
                .append('div')
                .classed(SampleSlicer.HeaderSelector.class, true);

            this.rangeSlicerHead = this.rangeSlicer
                .append('div')
                .classed(SampleSlicer.RangeSlicerHeadSelector.class, true);

            this.rangeSlicerControls = this.rangeSlicerHead
                .append('div')
                .classed(SampleSlicer.RangeSlicerControlsSelector.class, true);

            this.rangeSlicerSlider = this.rangeSlicerHead
                .append('div')
                .classed(SampleSlicer.RangeSlicerSliderSelector.class, true);

            this.startControl = this.rangeSlicerControls
                .append('div')
                .classed(SampleSlicer.RangeSlicerControlSelector.class, true);

            this.endControl = this.rangeSlicerControls
                .append('div')
                .classed(SampleSlicer.RangeSlicerControlSelector.class, true);

            let $startControl: JQuery = $(this.startControl[0][0]);
            let $endControl: JQuery = $(this.endControl[0][0]);

            this.$start = this.createInputElement($startControl);
            this.$end = this.createInputElement($endControl);


            let slicerContainer: Selection<any> = d3.select(this.$root.get(0))
                .append('div')
                .classed(SampleSlicer.ContainerSelector.class, true)
                .style({
                    'background': '#ffffff'
                });

            this.slicerHeader
                .append('div')
                .classed(SampleSlicer.HeaderTextSelector.class, true)
                .style({
                    'margin-left': PixelConverter.toString(settings.headerText.marginLeft),
                    'margin-top': PixelConverter.toString(settings.headerText.marginTop)
                });

            this.createSearchHeader($(slicerContainer.node()));

            this.slicerBody = slicerContainer
                .append('div')
                .classed(SampleSlicer.BodySelector.class, true)
                .style({
                    'height': (slicerBodyViewport.height - 120) + "px"
                });


            let rowEnter = (rowSelection: Selection<any>) => {
                this.enterSelection(rowSelection);
            };

            let rowUpdate = (rowSelection: Selection<any>) => {
                this.updateSelection(rowSelection);
            };

            let rowExit = (rowSelection: Selection<any>) => {
                rowSelection.remove();
            };

            let tableViewOptions: TableViewViewOptions = {
                rowHeight: this.getRowHeight(),
                columnWidth: this.settings.slicerText.width,
                rows: this.settings.general.rows,
                columns: this.settings.general.columns,
                enter: rowEnter,
                exit: rowExit,
                update: rowUpdate,
                scrollEnabled: true,
                viewport: this.getSlicerBodyViewport(this.currentViewport),
                baseContainer: this.slicerBody,
            };

            this.bindHandlersToInputElements();
            this.tableView = TableViewFactory.createTableView(tableViewOptions);
        }

        private bindHandlersToInputElements(): void {

            this.$start.on("change", (event: JQueryEventObject) => {
                let inputString = this.$start.val();
                this.onRangeInputTextboxChange(inputString, RangeValueType.Start);
            });

            this.$start.on("keyup", (event: JQueryEventObject) => {
                if (event.keyCode == 13) {
                    let inputString = this.$start.val();
                    this.onRangeInputTextboxChange(inputString, RangeValueType.Start);
                }
            });

            // We need the input to show formatted string when not in focus and show the actual filter value when in foucs.
            this.$start.on("focus", (event: JQueryEventObject) => {
                this.$start.val(this.formatValue(this.scalableRange.getValue().min));
                this.$start.select();
            });
            this.$start.on("blur", (event: JQueryEventObject) => {
                this.$start.val(this.formatValue(this.scalableRange.getValue().min));
            });

            this.$end.on("change", (event: JQueryEventObject) => {
                let inputString = this.$end.val();
                this.onRangeInputTextboxChange(inputString, RangeValueType.End);
            });

            this.$end.on("keyup", (event: JQueryEventObject) => {
                if (event.keyCode == 13) {
                    let inputString = this.$end.val();
                    this.onRangeInputTextboxChange(inputString, RangeValueType.End);
                }
            });

            // We need the input to show formatted string when not in focus and show the actual filter value when in foucs.
            this.$end.on("focus", (event: JQueryEventObject) => {
                this.$end.val(this.formatValue(this.scalableRange.getValue().max));
                this.$end.select();
            });
            this.$end.on("blur", (event: JQueryEventObject) => {
                this.$end.val(this.formatValue(this.scalableRange.getValue().max));
            });
        }

        private createSliderOptions(): noUiSlider.Options {
            let value = this.scalableRange.getScaledValue();

            let options: noUiSlider.Options = {
                connect: true,
                behaviour: "tap-drag",
                range: {
                    min: 0,
                    max: 100
                },
                start: [value.min, value.max]
            };

            return options;
        }


        private updateSliderControl(): void {
            let $sliderContainer: JQuery = $(this.rangeSlicerSlider[0][0]);

            if (!this.slider) {
                //create slider 
                this.$sliderElement = $('<div/>')
                    .appendTo($sliderContainer);
                (<any>window).noUiSlider.create(this.$sliderElement.get(0), this.createSliderOptions());

                this.slider = (<noUiSlider.Instance>this.$sliderElement.get(0)).noUiSlider;

                //populate slider event handlers 
                this.slider.on("change", (data: any[], index: number, values: any) => {
                    this.scalableRange.setScaledValue({ min: values[0], max: values[1] });
                    this.onRangeChange();
                });

            } else {
                //get the scaled range value 
                //and use it to set the slider 
                let scaledValue = this.scalableRange.getScaledValue();
                this.slider.set([scaledValue.min, scaledValue.max]);
            }
        }

        public updateSliderInputTextboxes(): void {
            this.$start.val(this.formatValue(this.scalableRange.getValue().min));
            this.$end.val(this.formatValue(this.scalableRange.getValue().max));
        }

        public formatValue(value: number): string {
            return value != null ? valueFormatter.format(value, "#") : '';
        }

        private onRangeInputTextboxChange(inputString: string, type: RangeValueType): void {
            //parse input
            let inputValue: number;
            if (!inputString) {
                inputValue = null;
            } else {
                inputValue = parseFloat(inputString);
                if (isNaN(inputValue)) {
                    inputValue = null;
                }
            }

            //apply input
            let range: ValueRange<number> = this.scalableRange.getValue();
            if (type === RangeValueType.Start) {
                range.min = inputValue;
            }
            else if (type === RangeValueType.End) {
                range.max = inputValue;
            }
            this.scalableRange.setValue(range);

            //trigger range change processing
            this.onRangeChange();
        }

        private onRangeChange(): void {
            this.behavior.clearAllDiscreteSelections();
            this.applyRangeFilter(this.scalableRange.getValue());
        }

        private applyRangeFilter(value: ValueRange<number>) {
            if (!value.min && !value.max) {
                return;
            }

            let categories: DataViewCategoricalColumn = this.dataView.categorical.categories[0];

            let target: IFilterColumnTarget = {
                table: categories.source.queryName.substr(0, categories.source.queryName.indexOf('.')),
                column: categories.source.displayName
            };
            let conditions: IAdvancedFilterCondition[] = [];

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


            this.filter = new window['powerbi-models'].AdvancedFilter(target, "And", conditions);
            this.visualHost.applyJsonFilter(this.filter, "general", "filter");
        }

        private enterSelection(rowSelection: Selection<any>): void {
            let settings: SampleSlicerSettings = this.settings;

            let ulItemElement: UpdateSelection<any> = rowSelection
                .selectAll('ul')
                .data((dataPoint: SampleSlicerDataPoint) => {
                    return [dataPoint];
                });

            ulItemElement
                .enter()
                .append('ul');

            ulItemElement
                .exit()
                .remove();

            let listItemElement: UpdateSelection<any> = ulItemElement
                .selectAll(SampleSlicer.ItemContainerSelector.selector)
                .data((dataPoint: SampleSlicerDataPoint) => {
                    return [dataPoint];
                });

            listItemElement
                .enter()
                .append('li')
                .classed(SampleSlicer.ItemContainerSelector.class, true);

            listItemElement.style({
                'margin-left': PixelConverter.toString(settings.slicerItemContainer.marginLeft)
            });

            let slicerImgWrapperSelection: UpdateSelection<any> = listItemElement
                .selectAll(SampleSlicer.SlicerImgWrapperSelector.selector)
                .data((dataPoint: SampleSlicerDataPoint) => {
                    return [dataPoint];
                });

            slicerImgWrapperSelection
                .enter()
                .append('img')
                .classed(SampleSlicer.SlicerImgWrapperSelector.class, true);

            slicerImgWrapperSelection
                .exit()
                .remove();

            let slicerTextWrapperSelection: UpdateSelection<any> = listItemElement
                .selectAll(SampleSlicer.SlicerTextWrapperSelector.selector)
                .data((dataPoint: SampleSlicerDataPoint) => {
                    return [dataPoint];
                });

            slicerTextWrapperSelection
                .enter()
                .append('div')
                .classed(SampleSlicer.SlicerTextWrapperSelector.class, true);

            let labelTextSelection: UpdateSelection<any> = slicerTextWrapperSelection
                .selectAll(SampleSlicer.LabelTextSelector.selector)
                .data((dataPoint: SampleSlicerDataPoint) => {
                    return [dataPoint];
                });

            labelTextSelection
                .enter()
                .append('span')
                .classed(SampleSlicer.LabelTextSelector.class, true);

            labelTextSelection.style({
                'font-size': PixelConverter.fromPoint(settings.slicerText.textSize),
            });

            labelTextSelection
                .exit()
                .remove();

            slicerTextWrapperSelection
                .exit()
                .remove();

            listItemElement
                .exit()
                .remove();
        };

        private updateSelection(rowSelection: Selection<any>): void {
            let settings: SampleSlicerSettings = this.settings,
                data: SampleSlicerData = this.slicerData;

            if (data && settings) {

                this.slicerHeader
                    .select(SampleSlicer.HeaderTextSelector.selector)
                    .text(this.slicerData.categorySourceName);

                let slicerText: Selection<any> = rowSelection.selectAll(SampleSlicer.LabelTextSelector.selector),
                    textProperties: TextProperties = SampleSlicer.getSampleTextProperties(settings.slicerText.textSize),
                    formatString: string = data.formatString;

                slicerText.text((d: SampleSlicerDataPoint) => {
                    let maxWidth: number = 0;

                    textProperties.text = valueFormatter.format(d.category, formatString);

                    if (this.settings.slicerText.width === 0) {
                        let slicerBodyViewport: IViewport = this.getSlicerBodyViewport(this.currentViewport);

                        maxWidth = (slicerBodyViewport.width / (this.tableView.computedColumns || SampleSlicer.MinColumns)) -
                            SampleSlicer.СhicletTotalInnerRightLeftPaddings -
                            SampleSlicer.СellTotalInnerBorders;
                        return textMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
                    }
                    else {
                        maxWidth = this.settings.slicerText.width -
                            SampleSlicer.СhicletTotalInnerRightLeftPaddings -
                            SampleSlicer.СellTotalInnerBorders;

                        return textMeasurementService.getTailoredTextOrDefault(textProperties, maxWidth);
                    }
                });

                rowSelection
                    .style({
                        'padding': PixelConverter.toString(settings.slicerText.padding)
                    });

                rowSelection.selectAll(SampleSlicer.ItemContainerSelector.selector).style({
                    'font-size': PixelConverter.fromPoint(settings.slicerText.textSize)
                });

                if (this.interactivityService && this.slicerBody) {
                    this.interactivityService.applySelectionStateToData(data.slicerDataPoints);

                    let slicerBody: Selection<any> = this.slicerBody.attr('width', this.currentViewport.width),
                        slicerItemContainers: Selection<any> = slicerBody.selectAll(SampleSlicer.ItemContainerSelector.selector);

                    let behaviorOptions: SampleSlicerBehaviorOptions = {
                        dataPoints: data.slicerDataPoints,
                        slicerItemContainers: slicerItemContainers,
                        interactivityService: this.interactivityService,
                        slicerSettings: data.slicerSettings,
                        isSelectionLoaded: this.isSelectionLoaded
                    };

                    this.interactivityService.bind(data.slicerDataPoints, this.behavior, behaviorOptions, {

                    });

                    this.behavior.styleSlicerInputs(
                        rowSelection.select(SampleSlicer.ItemContainerSelector.selector),
                        this.interactivityService.hasSelection());
                }
                else {
                    this.behavior.styleSlicerInputs(rowSelection.select(SampleSlicer.ItemContainerSelector.selector), false);
                }
            }
        };

        private createSearchHeader(container: JQuery): void {
            let counter: number = 0;

            this.$searchHeader = $("<div>")
                .appendTo(container)
                .addClass("searchHeader")
                .addClass("show");

            $("<div>").appendTo(this.$searchHeader)
                .attr("title", "Search")
                .addClass("search");

            this.$searchInput = $("<input>").appendTo(this.$searchHeader)
                .attr("type", "text")
                .attr("drag-resize-disabled", "true")
                .addClass("searchInput")
                .on("input", () => this.visualHost.persistProperties(<VisualObjectInstancesToPersist>{
                    merge: [{
                        objectName: "general",
                        selector: null,
                        properties: {
                            counter: counter++
                        }
                    }]
                }));
        }

        private getSlicerBodyViewport(currentViewport: IViewport): IViewport {
            let settings: SampleSlicerSettings = this.settings,
                height: number = currentViewport.height,
                width: number = currentViewport.width - SampleSlicer.WidthOfScrollbar;
            return {
                height: Math.max(height, SampleSlicer.MinSizeOfViewport),
                width: Math.max(width, SampleSlicer.MinSizeOfViewport)
            };
        }

        public static getSampleTextProperties(textSize?: number): TextProperties {
            return <TextProperties>{
                fontFamily: SampleSlicer.DefaultFontFamily,
                fontSize: PixelConverter.fromPoint(textSize || SampleSlicer.DefaultFontSizeInPt),
            };
        }

        private getRowHeight(): number {
            let textSettings = this.settings.slicerText;
            return textSettings.height !== 0
                ? textSettings.height
                : textMeasurementService.estimateSvgTextHeight(SampleSlicer.getSampleTextProperties(textSettings.textSize));
        }
    }
}
