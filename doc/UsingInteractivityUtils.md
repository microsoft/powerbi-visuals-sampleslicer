# Using InteractivityUtils

The utility package [InteractivityUtils](https://github.com/Microsoft/powerbi-visuals-utils-interactivityutils) provides a set of functions and interfaces that simplify cross-visual datapoint selection and filtering. 

The Sample Slicer visual has all selection-related logic concentrated in one file *[selectionBehavior.ts](/src/selectionBehavior.ts).

For *discrete* cross-visual data-point selection the Sample Slicer visual relies on the interface [ISelectionHandler](https://github.com/Microsoft/powerbi-visuals-utils-interactivityutils/blob/master/src/interactivityservice.ts) of the InteractivityUtils package. 



An instance implementing ISelectionHandler interface is created by the InteractivityUtils and supplied to SelectionBehavior class as argument of SelectionBehavior::bindEvents() method call. 

```
pbiviz start
```
