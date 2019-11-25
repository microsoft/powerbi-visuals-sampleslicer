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
import powerbiVisualsApi from "powerbi-visuals-api";
import { ScaleLinear, scaleLinear as d3ScaleLinear } from "d3";

export class ScalableRange {
    private static readonly TRANSFORMATION_RANGE_MIN = 0;
    private static readonly TRANSFORMATION_RANGE_MAX = 100;

    private range: powerbiVisualsApi.ValueRange<number>;
    private scalingTransformationDomain: powerbiVisualsApi.ValueRange<number>;
    private scalingTransformation: any;

    constructor() {
        this.range = {
            min: null,
            max: null
        };

        this.scalingTransformationDomain = {
            min: null,
            max: null
        };

        this.scalingTransformation = null;
    }

    public isActive(): boolean {
        return this.range.min != null || this.range.max != null;
    }

    public setScalingTransformationDomain(transformationDomain: powerbiVisualsApi.ValueRange<number>): void {
        this.scalingTransformationDomain = transformationDomain;
        this.scalingTransformation = d3ScaleLinear() // TMP ScaleLinear as LinearScale, scaleLinear / d3.scale.linear()
            .domain([transformationDomain.min, transformationDomain.max])
            .range([ScalableRange.TRANSFORMATION_RANGE_MIN, ScalableRange.TRANSFORMATION_RANGE_MAX]);
    }

    public getScalingTransformationDomain(): powerbiVisualsApi.ValueRange<number> {
        return this.scalingTransformationDomain;
    }

    public getScaledValue(): powerbiVisualsApi.ValueRange<number> {
        return {
            min: (!this.range || !this.range.min) ? ScalableRange.TRANSFORMATION_RANGE_MIN : this.scalingTransformation(this.saturateDomainValue(this.range.min)),
            max: (!this.range || !this.range.max) ? ScalableRange.TRANSFORMATION_RANGE_MAX : this.scalingTransformation(this.saturateDomainValue(this.range.max)),
        };
    }

    private saturateDomainValue(domainValue: number) {
        if (domainValue < this.scalingTransformationDomain.min) {
            return this.scalingTransformationDomain.min;
        }
        if (domainValue > this.scalingTransformationDomain.max) {
            return this.scalingTransformationDomain.max;
        }
        return domainValue;
    }

    public setValue(range: powerbiVisualsApi.ValueRange<number>): void {
        this.range = range;
    }

    public getValue(): powerbiVisualsApi.ValueRange<number> {
        return this.range;
    }

    public setScaledValue(scaledRange: powerbiVisualsApi.ValueRange<number>): void {
        this.range = {
            min: (scaledRange.min === ScalableRange.TRANSFORMATION_RANGE_MIN) ? (this.range.min < this.scalingTransformationDomain.min ? this.range.min : null) : this.scalingTransformation.invert(scaledRange.min),
            max: (scaledRange.max === ScalableRange.TRANSFORMATION_RANGE_MAX) ? (this.range.max > this.scalingTransformationDomain.max ? this.range.max : null) : this.scalingTransformation.invert(scaledRange.max)
        };
    }
}