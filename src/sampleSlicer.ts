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

// "use strict";
import "../style/sampleSlicer.less";
import isEqual from "lodash.isequal";
import * as noUiSlider from "nouislider";

// d3
import {
    select as d3Select,
    Selection as D3Selection,
} from "d3";

type Selection<T> = D3Selection<any, T, any, any>;

// powerbi
import {
  IFilter,
  IFilterColumnTarget,
  IAdvancedFilter,
  Filter,
  PrimitiveValueType,
} from "powerbi-models";

import powerbiVisualsApi from "powerbi-visuals-api";
import DataView = powerbiVisualsApi.DataView;
import IViewport = powerbiVisualsApi.IViewport;
import ValueRange = powerbiVisualsApi.ValueRange;
import FilterAction = powerbiVisualsApi.FilterAction;

import DataViewCategoryColumn = powerbiVisualsApi.DataViewCategoryColumn;
import DataViewCategoricalColumn = powerbiVisualsApi.DataViewCategoricalColumn;

import VisualObjectInstanceEnumeration = powerbiVisualsApi.VisualObjectInstanceEnumeration;
import EnumerateVisualObjectInstancesOptions = powerbiVisualsApi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstancesToPersist = powerbiVisualsApi.VisualObjectInstancesToPersist;

import DataViewObjectPropertyIdentifier = powerbiVisualsApi.DataViewObjectPropertyIdentifier;
import IVisualEventService = powerbiVisualsApi.extensibility.IVisualEventService;

import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbiVisualsApi.extensibility.ISelectionManager;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;

import ISelectionId = powerbiVisualsApi.visuals.ISelectionId;

// powerbi-visuals-utils-dataviewutils
import { dataViewObjects as DataViewObjectsModule } from "powerbi-visuals-utils-dataviewutils";

// powerbi-visuals-utils-typeutils
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";

// powerbi-visuals-utils-interactivityutils
import {
    interactivityBaseService,
    interactivitySelectionService,
    interactivityFilterService,
} from "powerbi-visuals-utils-interactivityutils";


import createInteractivityFilterService = interactivityFilterService.createInteractivityFilterService;
import InteractivityFilterService = interactivityFilterService.InteractivityFilterService;
import IInteractivityService = interactivityBaseService.IInteractivityService;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;

// powerbi-visuals-utils-svgutils
import * as SVGUtil from "powerbi-visuals-utils-svgutils";
import IMargin = SVGUtil.IMargin;
import ClassAndSelector = SVGUtil.CssConstants.ClassAndSelector;
import createClassAndSelector = SVGUtil.CssConstants.createClassAndSelector;

// powerbi-visuals-utils-formattingutils
import { valueFormatter as valueFormatter, textMeasurementService as tms } from "powerbi-visuals-utils-formattingutils";
import IValueFormatter = valueFormatter.IValueFormatter;
import TextProperties = tms.TextProperties;
import textMeasurementService = tms.textMeasurementService;

import { Settings, defaultSettings, persistedSettingsDataViewObjectPropertyIdentifiers } from "./settings";
import { ScalableRange } from "./scalableRange";
import { ITableView, TableViewOptions,  TableViewFactory } from "./tableView";
import { SelectionBehavior, SampleSlicerBehaviorOptions } from "./selectionBehavior";
import { SampleSlicerConverter } from "./sampleSlicerConverter";
import { FilterDataPoint } from "powerbi-visuals-utils-interactivityutils/lib/interactivityFilterService";

export const enum RangeValueType {
    Start,
    End
}

export interface SampleSlicerData {
    categorySourceName: string;
    formatString: string;
    slicerDataPoints: SampleSlicerDataPoint[];
    slicerSettings: Settings;
}

export interface SampleSlicerDataPoint extends FilterDataPoint {// DEV SelectableDataPoint {
    identity?:  any; // DEV
    category: string | number;
    isSelectedRangePoint?: boolean;
    filtered?: boolean;
}

export interface SampleSlicerCallbacks {
    getPersistedSelectionState?: () => ISelectionId[];
    restorePersistedRangeSelectionState?: () => void;
    applyFilter?: (filter: IFilter) => void;
    getFilterColumnTarget?: () => IFilterColumnTarget;
}

export class SampleSlicer implements IVisual {
    // Main properties
    private currentViewport: IViewport;
    private dataView: DataView;
    private slicerData: SampleSlicerData;

    private interactivityService: any; //InteractivityFilterService; // DEV IInteractivityService<any>;
    private selectionManager: ISelectionManager;
    private eventService: IVisualEventService;

    private visualHost: IVisualHost;
    private settings: Settings;
    private jsonFilters: powerbiVisualsApi.IFilter[];

    // DOM Elements
    private root: HTMLElement;
    private searchWrapper: HTMLElement;

    private sliderElement: HTMLElement;
    
    private clearButton: HTMLElement;
    private searchInput: HTMLInputElement;
    private startInput: HTMLInputElement;
    private endInput: HTMLInputElement;

    //
    private slider: noUiSlider.noUiSlider;
    private tableView: ITableView;
    private behavior: SelectionBehavior;

    // Selections
    private slicerHeader: Selection<any>;
    private slicerBody: Selection<any>;

    private rangeSlicer: Selection<any>;
    private rangeSlicerHead: Selection<any>;
    private rangeSlicerControls: Selection<any>;
    private rangeSlicerSlider: Selection<any>;
    private startControl: Selection<any>;
    private endControl: Selection<any>;

    //state
    private waitingForData: boolean;
    private updateFilter: boolean; // DEV

    // Constants
    public static DefaultFontFamily: string = "helvetica, arial, sans-serif";
    public static DefaultFontSizeInPt: number = 11;
    private static СellTotalInnerBorders: number = 2;
    private static СhicletTotalInnerRightLeftPaddings: number = 14;
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
    public static ClearButtonSelector: ClassAndSelector = createClassAndSelector('clearButton');
    public static BodySelector: ClassAndSelector = createClassAndSelector('slicerBody');
    public static RangeSlicerSelector: ClassAndSelector = createClassAndSelector('numeric-range-slicer');
    public static RangeSlicerHeadSelector: ClassAndSelector = createClassAndSelector('numeric-range-slicer-head');
    public static RangeSlicerControlsSelector: ClassAndSelector = createClassAndSelector('numeric-range-slicer-range');
    public static RangeSlicerSliderSelector: ClassAndSelector = createClassAndSelector('numeric-range-slicer-slider');
    public static RangeSlicerControlSelector: ClassAndSelector = createClassAndSelector('numeric-range-slicer-control');
    public static InputClass: ClassAndSelector = createClassAndSelector('numeric-range-slicer-input');

    public static converter(
        dataView: DataView,
        searchText: string,
        scalableRange: ScalableRange,
        visualHost: IVisualHost,
        jsonFilters: powerbiVisualsApi.IFilter[]
    ): SampleSlicerData {

        if (!dataView ||
            !dataView.categorical ||
            !dataView.categorical.categories ||
            !dataView.categorical.categories[0] ||
            !dataView.categorical.categories[0].values ||
            !(dataView.categorical.categories[0].values.length > 0)) {
            return;
        }

        const converter: SampleSlicerConverter = new SampleSlicerConverter(dataView, visualHost, jsonFilters);
        converter.convert(scalableRange);
        
        const slicerSettings: Settings = defaultSettings;

        if (dataView.metadata.objects) {
            slicerSettings.general.selection = DataViewObjectsModule.getValue(
              dataView.metadata.objects,
              persistedSettingsDataViewObjectPropertyIdentifiers.general.selection,
              defaultSettings.general.selection
            );
            slicerSettings.general.rangeSelectionStart = DataViewObjectsModule.getValue(
              dataView.metadata.objects,
              persistedSettingsDataViewObjectPropertyIdentifiers.general.rangeSelectionStart,
              defaultSettings.general.selection
            );
            slicerSettings.general.rangeSelectionEnd = DataViewObjectsModule.getValue(
              dataView.metadata.objects,
              persistedSettingsDataViewObjectPropertyIdentifiers.general.rangeSelectionEnd,
              defaultSettings.general.selection
            );
            slicerSettings.general.filter = DataViewObjectsModule.getValue(
              dataView.metadata.objects,
              persistedSettingsDataViewObjectPropertyIdentifiers.general.filter,
              defaultSettings.general.filter
            );
        }

        if (searchText) {
            searchText = searchText.toLowerCase();
            converter.dataPoints.forEach(x => x.filtered = x.category.toString().toLowerCase().indexOf(searchText) !== 0); // TMP toString
        }

        const categories: DataViewCategoricalColumn = dataView.categorical.categories[0];
        return <SampleSlicerData> {
            categorySourceName: categories.source.displayName,
            formatString: valueFormatter.getFormatStringByColumn(categories.source),
            slicerSettings: slicerSettings,
            slicerDataPoints: converter.dataPoints
        };
    }

    /*
    * Static helpers
    */

    public static formatValue(value: number): string {
        return value != null ? valueFormatter.format(String(value), "#") : '';
    }

    public static getSampleTextProperties(textSize?: number): TextProperties {
      return <TextProperties>{
          fontFamily: SampleSlicer.DefaultFontFamily,
          fontSize: PixelConverter.fromPoint(textSize || SampleSlicer.DefaultFontSizeInPt),
      };
    }

    private static getLengthOptional(identity: any[]): number {
        if (identity) {
            return identity.length;
        }
        return 0;
    }

    private static createElement(htmlString: string): HTMLElement {
        const parser = new DOMParser();
        const html = parser.parseFromString(htmlString, 'text/html');
        return <HTMLElement>html.body.firstChild;
    }

    private static appendInputElement(parent: HTMLElement): HTMLInputElement {
        parent.appendChild(
            SampleSlicer.createElement(`<input type="text" class="${SampleSlicer.InputClass.className}"/>`)
        );
        return <HTMLInputElement>parent.querySelector("input");
    }

    private static getSlicerBodyViewport(currentViewport: IViewport): IViewport {
      const height: number = currentViewport.height,
          width: number = currentViewport.width - SampleSlicer.WidthOfScrollbar;
      return {
          height: Math.max(height, SampleSlicer.MinSizeOfViewport),
          width: Math.max(width, SampleSlicer.MinSizeOfViewport)
      };
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
            let dv1Identity: any[] = (<DataViewCategoryColumn>dv1Categories[i]).identity;
            let dv2Identity: any[] = (<DataViewCategoryColumn>dv2Categories[i]).identity;

            let dv1Length: number = this.getLengthOptional(dv1Identity);
            if ((dv1Length < 1) || dv1Length !== this.getLengthOptional(dv2Identity)) {
                return false;
            }

            for (let j: number = 0; j < dv1Length; j++) {
                if (!isEqual(dv1Identity[j].key, dv2Identity[j].key)) {
                    return false;
                }
            }
        }

        return true;
    }

    /*
     *  Public
     */

    constructor(options: VisualConstructorOptions) {
        if (window.location !== window.parent.location) {
          require("core-js/stable");
        }

        this.root = options.element;
        this.visualHost = options.host;
        this.behavior = new SelectionBehavior(this.getCallbacks());
        this.interactivityService = createInteractivityFilterService(options.host);

        this.settings = defaultSettings;
        this.eventService = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
    }

    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        return [];
    }

    public update(options: VisualUpdateOptions) {
        if (!options ||
            !options.dataViews ||
            !options.dataViews[0] ||
            !options.viewport) {
            return;
        }

        this.eventService.renderingStarted(options);

        this.jsonFilters = options.jsonFilters;
        this.restoreRangeFilter(options.dataViews[0]);

        // create viewport if not yet created
        if (!this.currentViewport) {
          this.currentViewport = options.viewport;
          this.initContainer();
        }

        // update dataview
        const existingDataView = this.dataView;
        this.dataView = options.dataViews[0];

        // check if the dataView changed to determine if scrollbars need to be reset
        let categoryIdentityChanged: boolean = true;
        if (existingDataView) {
          categoryIdentityChanged = !SampleSlicer.hasSameCategoryIdentity(existingDataView, this.dataView);
        }
        
        // update viewport
        if (options.viewport.height === this.currentViewport.height
            && options.viewport.width === this.currentViewport.width) {
            this.waitingForData = false;
        }
        else {
            this.currentViewport = options.viewport;
        }

        this.updateInternal(categoryIdentityChanged);
        this.eventService.renderingFinished(options);
    }

    /*
     *  Private
     */

    private initContainer() {
        const settings: Settings = this.settings,
            slicerBodyViewport: IViewport = SampleSlicer.getSlicerBodyViewport(this.currentViewport);

        // Prevents visual container from doing any other actions on keypress
        this.root.addEventListener("keyup", (event: KeyboardEvent) => {
          event.stopPropagation()
        });

        this.root.addEventListener('contextmenu', (event) => {
            const emptySelection = {
                "measures": [],
                "dataMap": {
                }
            };
            
            this.selectionManager.showContextMenu(emptySelection, {
                x: event.clientX,
                y: event.clientY
            });
            event.preventDefault();
        });

        this.root.addEventListener("keydown", (event: KeyboardEvent) =>{
            event.stopPropagation()
        });
        const outerContainer = SampleSlicer.createElement("<div class='sampleSlicer outerContainer' />");
        this.root.appendChild(outerContainer)


        // this.initClearButton(outerContainer); //Temporary unavailable
        this.initHeader(outerContainer);
        this.initRangeSlicer(outerContainer);

        const slicerContainer: Selection<any> = d3Select(outerContainer)
            .append('div')
            .classed(SampleSlicer.ContainerSelector.className, true)
            .style('background', '#ffffff');

        this.initSearchWidget(slicerContainer.node());

        // SLICER BODY & TABLE VIEW
        this.slicerBody = slicerContainer
            .append('div')
            .classed(SampleSlicer.BodySelector.className, true)
            .style('height', `${slicerBodyViewport.height - 120}px`);

        this.initTableView();
    }

    private updateInternal(categoryIdentityChanged: boolean): void {
        // convert data to internal representation
        let data = SampleSlicer.converter(
            this.dataView,
            (<HTMLInputElement>this.searchInput).value,
            this.behavior.scalableRange,
            this.visualHost,
            this.jsonFilters
        );
    
        if (!data) {
            this.tableView.empty();
            return;
        }
        
        this.slicerData = data;
       
        this.settings = this.slicerData.slicerSettings;
        
        this.slicerBody
            .style('height', `${this.currentViewport.height - 120}px`);

        this.updateTableView(categoryIdentityChanged);

        this.updateRangeSlicer();
    }

    /* 
     * Visual parts initialization and update
     */

    private initHeader(parent: HTMLElement): void {
      const headerText = this.settings.headerText;

      this.slicerHeader = d3Select(parent)
          .append('div')
          .classed(SampleSlicer.HeaderSelector.className, true);
      
      this.slicerHeader
          .append('div')
          .classed(SampleSlicer.HeaderTextSelector.className, true)
          .style('margin-left', PixelConverter.toString(headerText.marginLeft))
          .style('margin-top', PixelConverter.toString(headerText.marginTop))
    }

    private updateHeader(): void {
      this.slicerHeader
        .select(SampleSlicer.HeaderTextSelector.selectorName)
        .text(this.slicerData.categorySourceName);
    }
    
    private initClearButton(parent: HTMLElement): void {
        this.clearButton = SampleSlicer.createElement(`<div class="${SampleSlicer.ClearButtonSelector.className}"> </div>`);
        
        parent.appendChild(this.clearButton);
        
        this.clearButton.addEventListener('click', () => {
            this.behavior.clearFilters();
        });
    }

    private initTableView(): void {
        const slicerText = this.settings.slicerText,
            rows = this.settings.general.rows,
            columns = this.settings.general.columns,
            viewport = SampleSlicer.getSlicerBodyViewport(this.currentViewport),
            slicerBody = this.slicerBody;

        let rowEnterHandler = (rowSelection: Selection<any>) => {
            this.enterSelection(rowSelection);
        };

        let rowUpdateHandler = (rowSelection: Selection<any>) => {
            this.updateSelection(rowSelection);
        };

        let rowExitHandler = (rowSelection: Selection<any>) => {
            rowSelection.remove();
        };

        const rowHeight = slicerText.height !== 0
          ? slicerText.height
          : textMeasurementService.estimateSvgTextHeight(SampleSlicer.getSampleTextProperties(slicerText.textSize))

        const tableViewOptions: TableViewOptions = {
            rowHeight,
            columnWidth: slicerText.width,
            rows,
            columns,
            onEnter: rowEnterHandler,
            onExit: rowExitHandler,
            onUpdate: rowUpdateHandler,
            scrollEnabled: true,
            viewport,
            baseContainer: slicerBody,
        };

        this.tableView = TableViewFactory.createTableView(tableViewOptions);
    }

    private updateTableView(resetScrollbarPosition: boolean): void {
        let slicerDataPoints: SampleSlicerDataPoint[] = this.slicerData.slicerDataPoints,
            slicerText = this.settings.slicerText,
            rows = this.settings.general.rows,
            columns = this.settings.general.columns;

        this.tableView
            .rowHeight(slicerText.height)
            .columnWidth(slicerText.width)
            .rows(rows)
            .columns(columns)
            .data(
                slicerDataPoints.filter(x => !x.filtered),
                (d: SampleSlicerDataPoint) => slicerDataPoints.indexOf(d),
                resetScrollbarPosition
            )
            .viewport(SampleSlicer.getSlicerBodyViewport(this.currentViewport))
            .render();
    }

    private initRangeSlicer(parent: HTMLElement): void {

      this.rangeSlicer = d3Select(parent)
          .append('div')
          .classed(SampleSlicer.RangeSlicerSelector.className, true)
          .style('background', '#ffffff');

        this.rangeSlicerHead = this.rangeSlicer
            .append('div')
            .classed(SampleSlicer.RangeSlicerHeadSelector.className, true);

        this.rangeSlicerControls = this.rangeSlicerHead
            .append('div')
            .classed(SampleSlicer.RangeSlicerControlsSelector.className, true);

        this.rangeSlicerSlider = this.rangeSlicerHead
            .append('div')
            .classed(SampleSlicer.RangeSlicerSliderSelector.className, true);

        this.startControl = this.rangeSlicerControls
            .append('div')
            .classed(SampleSlicer.RangeSlicerControlSelector.className, true);

        this.endControl = this.rangeSlicerControls
            .append('div')
            .classed(SampleSlicer.RangeSlicerControlSelector.className, true);

        this.startInput = SampleSlicer.appendInputElement(this.startControl.nodes()[0]);
        this.endInput = SampleSlicer.appendInputElement(this.endControl.nodes()[0]);

        this.startInput.addEventListener("change", (event: Event) => {
            const inputString: string = this.startInput.value;
            this.onRangeInputTextboxChange(inputString, RangeValueType.Start);
        });

        this.startInput.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.keyCode === 13) {
                const inputString: string = this.startInput.value;
                this.onRangeInputTextboxChange(inputString, RangeValueType.Start);
            }
        });

        this.startInput.addEventListener("focus", (event: Event) => {
            this.startInput.value = SampleSlicer.formatValue(this.behavior.scalableRange.getValue().min);
            this.startInput.select();
        });

        this.endInput.addEventListener("change", (event: Event) => {
            const inputString: string = this.endInput.value;
            this.onRangeInputTextboxChange(inputString, RangeValueType.End);
        });

        this.endInput.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.keyCode === 13) {
                const inputString: string = this.endInput.value;
                this.onRangeInputTextboxChange(inputString, RangeValueType.End);
            }
        });

        this.endInput.addEventListener("focus", (event: Event) => {
            this.endInput.value = SampleSlicer.formatValue(this.behavior.scalableRange.getValue().max);
            this.endInput.select();
        });
    }

    private updateRangeSlicer(): void {
        if (!this.slider) {
            const sliderContainer: HTMLElement = this.rangeSlicerSlider.nodes()[0];
            this.initNoUISlider(sliderContainer);
        } else {
            // get the scaled range value
            // and use it to set the slider
            let scaledValue = this.behavior.scalableRange.getScaledValue();
            this.slider.set([scaledValue.min, scaledValue.max]);
        }

        this.startInput.value =  SampleSlicer.formatValue(this.behavior.scalableRange.getValue().min);
        this.endInput.value =  SampleSlicer.formatValue(this.behavior.scalableRange.getValue().max);
    }

    private initNoUISlider(parent: HTMLElement) {
        this.sliderElement = parent.appendChild(
            SampleSlicer.createElement('<div />')
        );

        const scaledValue = this.behavior.scalableRange.getScaledValue();
        const sliderOptions: noUiSlider.Options = {
            connect: true,
            behaviour: "tap-drag",
            range: {
                min: 0,
                max: 100
            },
            start: [scaledValue.min, scaledValue.max]
        };

        noUiSlider.create(this.sliderElement, sliderOptions);

        this.slider = (<noUiSlider.Instance>this.sliderElement).noUiSlider;

        // populate slider event handlers
        this.slider.on(
          "change",
          (data: any[], index: number, values: any) => { //HANDLER
              this.behavior.scalableRange.setScaledValue({ min: values[0], max: values[1] });
              this.behavior.updateOnRangeSelectonChange();
              this.updateInternal(false);
          }
        );
    }

    private initSearchWidget(parent: HTMLElement): void {
        let counter: number = 0;

        this.searchWrapper = SampleSlicer.createElement(`<div class="searchHeader show" />`);
        parent.appendChild(this.searchWrapper);

        this.searchWrapper.appendChild(
          SampleSlicer.createElement(`<div class="search" title="Search" />`)
        );

        this.searchInput = <HTMLInputElement>SampleSlicer.createElement(`<input type="text" drag-resize-disabled class="searchInput"/>`);

        const searchEventlinstener = () => { //HANDLER
          this.visualHost.persistProperties(<VisualObjectInstancesToPersist>{
              merge: [{
                  objectName: "general",
                  selector: null,
                  properties: {
                      counter: counter++
                  }
              }]
          });
          this.updateInternal(false);
        };

        this.searchInput.addEventListener(
            "input",
            searchEventlinstener
        );

        this.searchWrapper.appendChild(this.searchInput);
    }

    private restoreRangeFilter(dataView: DataView){
        if (this.jsonFilters && 
            (dataView.metadata && dataView.metadata.columns && dataView.metadata.columns[0])
        ){
            const filter: IAdvancedFilter = <IAdvancedFilter> this.jsonFilters.find((filter: IAdvancedFilter) => {
                const target: { table?: string, column?: string} = <any>filter.target;
                const source: string[] | undefined = String(dataView.metadata.columns[0].queryName).split('.');
                if(source && source[0] && source[1]){
                    return filter.logicalOperator == "And" && filter.target && target.table === source[0] && target.column === source[1];
                } else {
                    return false;
                }
            });

            if (filter && filter.conditions) {
                const greaterThen = filter.conditions.find(cond => cond.operator === "GreaterThan"),
                    lessThen = filter.conditions.find(cond => cond.operator === "LessThan");
                const range: {
                    min: number | null;
                    max: number | null;
                } = {
                    min: greaterThen ? Number(greaterThen.value) : null,
                    max: lessThen ? Number(lessThen.value) : null
                };

                this.behavior.scalableRange.setValue(range);
            }
        }
    }

    /*
     *  Handlers
     */ 

    private onRangeInputTextboxChange(
        inputString: string,
        rangeValueType: RangeValueType,
        supressFilter: boolean = false
    ): void {
        // parse input
        let inputValue: number;
        if (!inputString) {
            inputValue = null;
        } else {
            inputValue = parseFloat(inputString);
            if (isNaN(inputValue)) {
                inputValue = null;
            }
        }
        // update range selection model if changed
        let range: ValueRange<number> = this.behavior.scalableRange.getValue();
        if (rangeValueType === RangeValueType.Start) {
            if (range.min === inputValue) {
                return;
            }
            range.min = inputValue;
        }
        else if (rangeValueType === RangeValueType.End) {
            if (range.max === inputValue) {
                return;
            }
            range.max = inputValue;
        }

        if (!supressFilter) {
            this.behavior.scalableRange.setValue(range);
            
            // trigger range change processing
            this.behavior.updateOnRangeSelectonChange();
            this.updateInternal(false);
        }
    }

    private enterSelection(rowSelection: Selection<any>): void {
        let settings: Settings = this.settings;

        let ulItemElement: Selection<any> = rowSelection
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

        let listItemElement: Selection<any> = ulItemElement
            .selectAll(SampleSlicer.ItemContainerSelector.selectorName)
            .data((dataPoint: SampleSlicerDataPoint) => {
                return [dataPoint];
            });

        listItemElement
            .enter()
            .append('li')
            .classed(SampleSlicer.ItemContainerSelector.className, true);

        listItemElement
            .style('margin-left', PixelConverter.toString(settings.slicerItemContainer.marginLeft));

        let slicerImgWrapperSelection: Selection<any> = listItemElement
            .selectAll(SampleSlicer.SlicerImgWrapperSelector.className)
            .data((dataPoint: SampleSlicerDataPoint) => {
                return [dataPoint];
            });

        slicerImgWrapperSelection
            .enter()
            .append('img')
            .classed(SampleSlicer.SlicerImgWrapperSelector.className, true);

        slicerImgWrapperSelection
            .exit()
            .remove();

        let slicerTextWrapperSelection: Selection<any> = listItemElement
            .selectAll(SampleSlicer.SlicerTextWrapperSelector.selectorName)
            .data((dataPoint: SampleSlicerDataPoint) => {
                return [dataPoint];
            });

        slicerTextWrapperSelection
            .enter()
            .append('div')
            .classed(SampleSlicer.SlicerTextWrapperSelector.className, true);

        let labelTextSelection: Selection<any> = slicerTextWrapperSelection
            .selectAll(SampleSlicer.LabelTextSelector.selectorName)
            .data((dataPoint: SampleSlicerDataPoint) => {
                return [dataPoint];
            });

        labelTextSelection
            .enter()
            .append('span')
            .classed(SampleSlicer.LabelTextSelector.className, true);

        labelTextSelection
          .style('font-size', PixelConverter.fromPoint(settings.slicerText.textSize));

        labelTextSelection
            .exit()
            .remove();

        slicerTextWrapperSelection
            .exit()
            .remove();

        listItemElement
            .exit()
            .remove();
    }

    private updateSelection(rowSelection: Selection<any>): void {
        let settings: Settings = this.settings,
            data: SampleSlicerData = this.slicerData;

        if (data && settings) {
            //update of rangeSlicer
            this.updateHeader();

            const slicerText: Selection<any> = rowSelection.selectAll(SampleSlicer.LabelTextSelector.selectorName),
                textProperties: TextProperties = SampleSlicer.getSampleTextProperties(settings.slicerText.textSize),
                formatString: string = data.formatString;

            slicerText.text((d: SampleSlicerDataPoint) => {
                let maxWidth: number = 0;

                textProperties.text = valueFormatter.format(d.category, formatString);

                if (this.settings.slicerText.width === 0) {
                    let slicerBodyViewport: IViewport = SampleSlicer.getSlicerBodyViewport(this.currentViewport);

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
                .style('padding', PixelConverter.toString(settings.slicerText.padding));

            rowSelection.selectAll(SampleSlicer.ItemContainerSelector.selectorName)
                .style('font-size', PixelConverter.fromPoint(settings.slicerText.textSize));

            if (this.interactivityService && this.slicerBody) {
                this.interactivityService.applySelectionStateToData(data.slicerDataPoints);

                let slicerBody: Selection<any> = this.slicerBody.attr('width', this.currentViewport.width),
                    slicerItemContainers: Selection<any> = slicerBody.selectAll(SampleSlicer.ItemContainerSelector.selectorName);

                let behaviorOptions: SampleSlicerBehaviorOptions = {
                    dataPoints: data.slicerDataPoints,
                    slicerItemContainers: slicerItemContainers,
                    interactivityService: this.interactivityService,
                    slicerSettings: data.slicerSettings,
                    behavior:  this.behavior,
                    dataView: <any>this.dataView,
                    category: this.dataView.categorical.categories[0],
                    jsonFilters: this.jsonFilters,
                };

                this.interactivityService.bind(behaviorOptions); //data.slicerDataPoints, this.behavior, behaviorOptions, {      });

                this.behavior.styleSlicerInputs(
                    rowSelection.select(SampleSlicer.ItemContainerSelector.selectorName),
                    this.interactivityService.hasSelection());
            }
            else {
                this.behavior.styleSlicerInputs(rowSelection.select(SampleSlicer.ItemContainerSelector.selectorName), false);
            }
        }
    }

    /**
     *  Callbacks consumed by the SelectionBehavior class
     * */
    private getCallbacks(): SampleSlicerCallbacks {
        let callbacks: SampleSlicerCallbacks = {};

        callbacks.applyFilter = (filter: IFilter): void => {
          this.visualHost.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
        };

        callbacks.getFilterColumnTarget = (): IFilterColumnTarget => {
            const target = interactivityFilterService.extractFilterColumnTarget(this.dataView.metadata.columns[0]);
            return target;
        };

        callbacks.getPersistedSelectionState = (): ISelectionId[] => {
            try {
                return JSON.parse(this.slicerData.slicerSettings.general.selection) || [];
            } catch (ex) {
                return [];
            }
        };

        return callbacks;
    }
}