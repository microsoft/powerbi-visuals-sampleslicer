# Enable synchronization for a slicer

To work with sync slicers your slicer (visual) must use API 1.13.

The second necessary aspect is enabled option in capabilities.json (see a picture below).

![](../doc/images/enabled-sync-slicer-in-capabilities.PNG)

After this you can see options in Sync Slicers panel when you click on your slicer (visual). But the panel must be enabled before.

`Also, pay attention that if your slicer has more than 1 bucket (category or measure) the feature will be disabled because sync slicers don't support several buckets.`

![](../doc/images/sync-slicers-panel.PNG)

In the panel you can see that your slicer visibility and its filtration may be apllied for several report pages. That's it.

You can dowlonad the following report to try this feature [demo PowerBI report with sync slicer](doc/SampleSlicerSync.pbix)