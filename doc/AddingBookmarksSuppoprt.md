# Adding bookmarks support to the project

The main documentation about bookmarks can be found [here](https://github.com/Microsoft/PowerBI-visuals/blob/master/Tutorial/BookmarksSupport.md).

To add bookmarks support for the visual, you should update to version 3.0.0 or higher of `powerbi-visuals-utils-interactivityutils`.

In the update `updateOnRangeSelectonChange` method the visual creates an AdvancedFilter and applies the filter with one or two conditions and calls `applyAdvancedFilter`, where `applyAdvancedFilter` [calls](https://github.com/Microsoft/powerbi-visuals-sampleslicer/blob/master/src/sampleSlicer.ts#L795) `this.visualHost.applyJsonFilter` method.

In each update the visual [inspects and restores](https://github.com/Microsoft/powerbi-visuals-sampleslicer/pull/6/files#diff-5929da3be6a696fb9df5e3571baceb52R356) the persisted filter by using [`FilterManager.restoreFilter`](https://github.com/Microsoft/PowerBI-visuals/blob/master/Tutorial/BookmarksSupport.md#visuals-with-filter).

```typescript
private restoreFilter(data: SampleSlicerData) {
    // restore advanced filter from visual properties
    let restoredFilter: IAdvancedFilter =
    FilterManager.restoreFilter(data && data.slicerSettings.general.filter) as IAdvancedFilter;
    // if filter was persisted, the visual retrieves the conditions of the advanced filter
    if (restoredFilter) {
        restoredFilter.target = this.getCallbacks().getAdvancedFilterColumnTarget();
        // reset to default
        // modify the values to match the filter values
        // in some cases we can receive values with only one condition
        if (restoredFilter.conditions.length === 1) {
            let value: {
                max?: any,
                min?: any
            } = {};

            // get min and max values in the dataset
            let convertedValues = data.slicerDataPoints.map( (dataPoint: SampleSlicerDataPoint) => +dataPoint.category );
            value.min = d3.min(convertedValues);
            value.max = d3.max(convertedValues);

            // if some conditions is missing, the visual adds the condition with matching value
            let operator = restoredFilter.conditions[0].operator;
            if (operator === "LessThanOrEqual" || operator === "LessThan") {
                restoredFilter.conditions.push({
                    operator: "GreaterThan",
                    value: value.min
                });
            }
            if (operator === "GreaterThanOrEqual" || operator === "GreaterThan") {
                restoredFilter.conditions.push({
                    operator: "LessThan",
                    value: value.max
                });
            }
        }

        // create ValueRange object to apply current filter state to the slicer visual
        let rangeValue: ValueRange<number> = <ValueRange<number>>{};

        restoredFilter.conditions.forEach( (condition: IAdvancedFilterCondition) => {
            let value = condition.value;
            let operator = condition.operator;
            if (operator === "LessThanOrEqual" || operator === "LessThan") {
                rangeValue.max = <number>value;
            }
            if (operator === "GreaterThanOrEqual" || operator === "GreaterThan") {
                rangeValue.min = <number>value;
            }
        });

        // change visual state of slicer
        this.behavior.scalableRange.setValue(rangeValue);
        // change visual state of text boxes
        this.onRangeInputTextboxChange(rangeValue.min.toString(), RangeValueType.Start);
        this.onRangeInputTextboxChange(rangeValue.max.toString(), RangeValueType.End);
    }
}
```
Resuming: in this method the visual restores the `restoredFilter` object, parses conditions for restoring saved values of the slicer and applies values to slicer and text boxes.

You **should not** persist the filter in the visual properties. Because Power BI saves filter for the visual. And `persistSelectionState`, `restorePersistedRangeSelectionState` and other methods [were removed](https://github.com/Microsoft/powerbi-visuals-sampleslicer/pull/6/files#diff-5929da3be6a696fb9df5e3571baceb52L809).