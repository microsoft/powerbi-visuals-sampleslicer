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

    export class SampleSlicerConverter {
        public dataPoints: SampleSlicerDataPoint[];

        private dataViewCategorical: DataViewCategorical;
        private category: DataViewCategoryColumn;
        private categoryValues: any[];
        private host: IVisualHost;

        public constructor(dataView: DataView, host: IVisualHost) {
            const dataViewCategorical: DataViewCategorical = dataView.categorical;
            this.dataViewCategorical = dataViewCategorical;
            this.host = host;
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

                    this.dataPoints.push({
                        identity: categorySelectionId as powerbi.visuals.ISelectionId,
                        category: categoryValue.toString(),
                        selected: true,
                        filtered: false,
                        isSelectedRangePoint: scalableRange.isActive() && SampleSlicerConverter.isNumberWithingRange(categoryValue, scalableRange.getValue())
                    });
                }

                scalableRange.setScalingTransformationDomain({
                    min: d3.min(this.categoryValues),
                    max: d3.max(this.categoryValues),
                });
            }
        }

        private static isNumberWithingRange(theNumber: number, subRange: ValueRange<number>): boolean {
            if (subRange.min && subRange.min > theNumber) {
                return false;
            }
            if (subRange.max && subRange.max < theNumber) {
                return false;
            }
            return true;
        }
    }
}
