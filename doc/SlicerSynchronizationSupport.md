# Enable Sync Slicers

To support Sync Slicers your custom slicer visual must use API 1.13 or higher.

The second necessary aspect is enabled option in capabilities.json (see a picture below).

![](../doc/images/enabled-sync-slicer-in-capabilities.PNG)

After this you can see Sync Slicers options panel when you click on your custom slicer visual.

`Also, pay attention that if your slicer has more than 1 field (category or measure) the feature will be disabled because Sync Slicer don't support several fields.`

![](../doc/images/sync-slicers-panel.PNG)

In the panel you can see that your slicer visibility and its filtration may be apllied for several report pages. That's it.

You can download the following report to try this feature [demo PowerBI report with sync slicer](doc/SampleSlicerSync.pbix)