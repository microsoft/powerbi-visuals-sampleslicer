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

// d3
import {
  select as d3Select,
  event as d3Event,
  Selection as D3Selection,
} from "d3";

type Selection<T> = D3Selection<any, T, any, any>;

import {
  IBasicFilter,
  BasicFilter,
  IAdvancedFilter,
  AdvancedFilter,
  IAdvancedFilterCondition,
  IFilterColumnTarget,
} from "powerbi-models";
import { FilterDataPoint } from "powerbi-visuals-utils-interactivityutils/lib/interactivityFilterService";

import powerbiVisualsApi from "powerbi-visuals-api";
import ValueRange = powerbiVisualsApi.ValueRange;

import {
  interactivityBaseService,
  interactivitySelectionService,
  interactivityFilterService,
} from "powerbi-visuals-utils-interactivityutils";

import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import IInteractivityService = interactivityBaseService.IInteractivityService;
import IFilterBehaviorOptions = interactivityFilterService.IFilterBehaviorOptions;
import IBehaviorOptions = interactivityBaseService.IBehaviorOptions;
import ISelectionHandler = interactivityBaseService.ISelectionHandler;

import { Settings } from "./settings";
import { ScalableRange } from "./scalableRange";
import { SampleSlicerDataPoint, SampleSlicerCallbacks } from "./sampleSlicer";

export interface SampleSlicerBehaviorOptions extends IFilterBehaviorOptions{ 
    slicerItemContainers: Selection<FilterDataPoint>;
    dataPoints: SampleSlicerDataPoint[];
    interactivityService: IInteractivityService<any>;
    slicerSettings: Settings;
}

export class SelectionBehavior implements IInteractiveBehavior {
    /* discrete selection model*/
    private selectionHandler: ISelectionHandler;
    /* range selection model*/
    public scalableRange: ScalableRange;

    private slicers: Selection<FilterDataPoint>;
    private interactivityService: IInteractivityService<any>;
    private slicerSettings: Settings;
    private options: SampleSlicerBehaviorOptions;
    private dataPoints: SampleSlicerDataPoint[];
    private callbacks: SampleSlicerCallbacks;

    private static mapDataPointsToFilterValues (dataPoints: SampleSlicerDataPoint[]): any[] {
        return (dataPoints
            .map( (dataPoint: SampleSlicerDataPoint) => (dataPoint.category || null) ) || [])
            .filter( (value: string | number | null ) => (typeof value === 'string' || typeof value === 'number') )
    }

    constructor(callbacks: SampleSlicerCallbacks) {
        this.scalableRange = new ScalableRange();
        this.callbacks = callbacks;
    }

    /**
        Implementation of IInteractiveBehavior i/f
    */
    public bindEvents(options: SampleSlicerBehaviorOptions, selectionHandler: ISelectionHandler): void {
        const slicers: Selection<FilterDataPoint> = this.slicers = options.slicerItemContainers;

        this.dataPoints = options.dataPoints;
        this.interactivityService = options.interactivityService;
        this.slicerSettings = options.slicerSettings;
        this.options = options;

        this.selectionHandler = selectionHandler;
        slicers.on("click", ( dataPoint: SampleSlicerDataPoint, _index: number) => {
            (d3Event as MouseEvent).preventDefault();
            this.clearRangeSelection();

            /* update selection state */
            selectionHandler.handleSelection(dataPoint, true /* isMultiSelect */);
            
            /* send selection state to the host*/
            let filterValues = SelectionBehavior.mapDataPointsToFilterValues(this.dataPoints.filter((dataPoint) => dataPoint.selected));

            if (filterValues.length === 0) {
                this.clearFilters();
            }
            else {
                let filter: IBasicFilter = {
                    $schema: "http://powerbi.com/product/schema#basic",
                    ...(new BasicFilter(
                        this.callbacks.getFilterColumnTarget(), 
                        "In",
                        filterValues 
                    ))
                };
                
                this.callbacks.applyFilter(filter);
            }
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
        if (this.selectionHandler) {
            this.selectionHandler.handleClearSelection();
        }
    }

    public clearRangeSelection(): void {
        this.scalableRange = new ScalableRange();
    }

    public styleSlicerInputs(slicers: Selection<any>, _hasSelection: boolean) {
        let settings = this.slicerSettings;
        slicers.each(function (dataPoint: SampleSlicerDataPoint) {
            d3Select(this)
                .style("background", (dataPoint.selected || dataPoint.isSelectedRangePoint)
                    ? settings.slicerText.selectedColor
                    : settings.slicerText.unselectedColor
                );
        });
    }

    public updateOnRangeSelectonChange(): void {
        this.clearAllDiscreteSelections();

        let value: ValueRange<number> = this.scalableRange.getValue();
        if (!value.min && value.min !== 0 && !value.max && value.max !== 0) {
            return;
        }

        let conditions: IAdvancedFilterCondition[] = [];
        let target: IFilterColumnTarget = this.callbacks.getFilterColumnTarget();

        if (value.min || value.min === 0) {
            conditions.push({
                operator: "GreaterThan",
                value: value.min
            });
        }

        if (value.max || value.max === 0) {
            conditions.push({
                operator: "LessThan",
                value: value.max
            });
        }

        let filter: IAdvancedFilter = {
          $schema: "http://powerbi.com/product/schema#advanced",
          ...(new AdvancedFilter(target, "And", conditions))
        }

        this.callbacks.applyFilter(filter);
    }

    public clearFilters(): void {
        this.callbacks.applyFilter(null);
    }
}