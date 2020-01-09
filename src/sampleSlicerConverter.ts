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

import { min as d3min, max as d3max } from "d3";

import powerbiVisualsApi from "powerbi-visuals-api";
import DataView = powerbiVisualsApi.DataView;
import ValueRange = powerbiVisualsApi.ValueRange;
import DataViewCategorical = powerbiVisualsApi.DataViewCategorical;
import DataViewCategoryColumn = powerbiVisualsApi.DataViewCategoryColumn;

import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;

import ISelectionId = powerbiVisualsApi.visuals.ISelectionId;

import { SampleSlicerDataPoint } from "./sampleSlicer";
import { ScalableRange } from "./scalableRange";


export class SampleSlicerConverter {
    public dataPoints: SampleSlicerDataPoint[];

    private dataViewCategorical: DataViewCategorical;
    private category: DataViewCategoryColumn;
    private categoryValues: any[];
    private host: IVisualHost;
    private jsonFilters: powerbiVisualsApi.IFilter[];

    public constructor(dataView: DataView, host: IVisualHost, jsonFilters: powerbiVisualsApi.IFilter[]) {
        const dataViewCategorical: DataViewCategorical = dataView.categorical;
        this.dataViewCategorical = dataViewCategorical;
        this.host = host;
        this.jsonFilters = jsonFilters;
        if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
            this.category = dataViewCategorical.categories[0];
            this.categoryValues = this.category.values;
        }
        this.dataPoints = [];
    }

    public convert(scalableRange: ScalableRange): void {
        this.dataPoints = [];

        if (this.categoryValues) {
            for (let categoryIndex: number = 0, categoryCount = this.categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                let categoryValue: any = this.categoryValues[categoryIndex];

                let categorySelectionId: ISelectionId = this.host.createSelectionIdBuilder()
                    .withCategory(this.category, categoryIndex)
                    .createSelectionId();

                let selected = !this.jsonFilters ? false : this.jsonFilters.reduce<boolean>(
                    (acc: boolean, currentFilter: { operator: string, values: any[] }, index: number) => { 
                        return acc || (
                            currentFilter.operator === "In" 
                            && currentFilter.values 
                            && currentFilter.values.indexOf 
                            && (currentFilter.values.indexOf(categoryValue.toString()) !== -1)
                        ); 
                    }, 
                    false);

                this.dataPoints.push({
                    identity: categorySelectionId as ISelectionId,
                    category: categoryValue.toString(),
                    selected: selected,
                    filtered: false,
                    isSelectedRangePoint: scalableRange.isActive() && SampleSlicerConverter.isNumberWithinRange(categoryValue, scalableRange.getValue())
                });
            }

            scalableRange.setScalingTransformationDomain({
                min: d3min(this.categoryValues),
                max: d3max(this.categoryValues),
            });
        }
    }

    private static isNumberWithinRange(theNumber: number, subRange: ValueRange<number>): boolean {
        if ((subRange.min || subRange.min === 0) && subRange.min >= theNumber) {
            return false;
        }
        if ((subRange.max || subRange.max === 0) && subRange.max <= theNumber) {
            return false;
        }
        return true;
    }
}