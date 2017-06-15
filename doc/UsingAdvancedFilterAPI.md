# Using the Advanced Filter API 

The [Advanced Filter API](https://github.com/Microsoft/powerbi-models) is introduced in the version 1.7.0 of [PowerBI Visuals Tools](https://github.com/Microsoft/PowerBI-visuals-tools) and enables complex cross-visual data-point selection/filtering queries based on multiple criteria (such as "LessThan", "Contains", "Is", "IsBlank", etc.). 

The Sample Slicer visual makes use of the [Advanced Filter API](https://github.com/Microsoft/powerbi-models) for the bulk selection of multiple data-points with just a single selection query. The query is generated based on the position of the sliders that intuitively define the selection range. 

The Sample Slicer visual has all selection-related logic concentrated in one file [*selectionBehavior.ts*](/src/selectionBehavior.ts).

The method below constructs the filter object and passes it along to the main visual module in [*sampleSlicer.ts*](/src/sampleSlicer.ts).

```
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
```

The main module then invokes the filter using the method applyJsonFilter() on the host interface IVisualHost provided to the visual in the constructor.  
```
    callbacks.applyAdvancedFilter = (filter: IAdvancedFilter): void => {
        this.visualHost.applyJsonFilter(filter, "general", "filter");
    };
```

Please note the strings "general" and "filter" refer to the filter entry we added to [*capabilities.json*](/capabilities.json) as follows: 

![](/doc/images/advanced-filter-api-in-capabilities.json.PNG)

The entry enables communication of selection-related information between the visual and the hosting application. 

For the complete description of the Advanced Filter API please refer to the [link](https://github.com/Microsoft/powerbi-models).
