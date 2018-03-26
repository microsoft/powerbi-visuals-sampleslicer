# Adding bookmarks support to the project

Main Documentation about bookmarks can be found [here](https://github.com/Microsoft/PowerBI-visuals/blob/master/Tutorial/BookmarksSupport.md).

To add bookmarks support for the visual, you should update `powerbi-visuals-utils-interactivityutils` to version 3.0.0 or higher.

In update `updateOnRangeSelectonChange` method the visual creates AdvancedFilter. And the visual applies the filter with one or two conditions and calls `applyAdvancedFilter`, where `applyAdvancedFilter` [calls](https://github.com/Microsoft/powerbi-visuals-sampleslicer/blob/master/src/sampleSlicer.ts#L795) `this.visualHost.applyJsonFilter` method of the host.

In each update the visual [check and restores](https://github.com/Microsoft/powerbi-visuals-sampleslicer/pull/6/files#diff-5929da3be6a696fb9df5e3571baceb52R356) the persisted filter by using [`FilterManager.restoreFilter`](https://github.com/Microsoft/PowerBI-visuals/blob/master/Tutorial/BookmarksSupport.md#visuals-with-filter).

```typescript
private restoreFilter(data: SampleSlicerData) {
    // restore advanced filter from vsual properties
    let restoredFilter: IAdvancedFilter =
    FilterManager.restoreFilter(data && data.slicerSettings.general.filter) as IAdvancedFilter;
    // if filter was persisted, the visual get conditions of advanced filter
    if (restoredFilter) {
        restoredFilter.target = this.getCallbacks().getAdvancedFilterColumnTarget();
        // reset to default
        // change value to correspond the filter values
        // in some case we can get value with one condition only
        if (restoredFilter.conditions.length === 1) {
            let value: {
                max?: any,
                min?: any
            } = {};

            // get max and min values in dataset
            let convertedValues = data.slicerDataPoints.map( (dataPoint: SampleSlicerDataPoint) => +dataPoint.category );
            value.min = d3.min(convertedValues);
            value.max = d3.max(convertedValues);

            // if some conditions is absent, the visuals adds the condition with correspond value
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

        // create ValueRange object to apply current filter state to slicer visual
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
Resuming: in this method, the visual restores `restoredFilter` object, parse conditions for restoring saved values of the slicer and apply values to slicer and text boxes.

The visual doesn't need to persist the filter in the visual properties. Because Power BI saves filter for the visual. And `persistSelectionState`, `restorePersistedRangeSelectionState` and other methods [were removed](https://github.com/Microsoft/powerbi-visuals-sampleslicer/pull/6/files#diff-5929da3be6a696fb9df5e3571baceb52L809).