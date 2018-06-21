# PowerBI Slicer custom visual sample
[![Build Status](https://travis-ci.org/Microsoft/powerbi-visuals-sampleslicer.svg?branch=master)](https://travis-ci.org/Microsoft/powerbi-visuals-sampleslicer)

Demonstrates the use of the Advanced Filtering API introduced in the version 1.7 of [PowerBI Visuals Tools](https://github.com/Microsoft/PowerBI-visuals-tools). 

This PowerBI Custom Visual relies on the Advanced Filter API for bulk data-point selection and [PowerBI Visuals Interactivity Utils](https://github.com/Microsoft/powerbi-visuals-utils-interactivityutils) for discrete data-point selection.

### Understanding the visual
The visual lets the user select numeric data inputs to be displayed in all other visuals in the same report sheet. The user can either select discrete values or a range by adjusting the sliders. 

See a [demo PowerBI report](doc/SampleSlicer.pbix) to get an idea about the visual's functionality.

![](doc/images/SampleSlicer.PNG)

### Other fetures
You can also see how to work with bookmarks and sync slicers.

Bookmarks support was added in API 1.11. For details see section [Adding bookmarks support to the project](doc/AddingBookmarksSuppoprt.md)

Sync slicer support was added in API 1.13. For details see section [Enable synchronization for a slicer](doc/SlicerSynchronizationSupport.md) and [demo PowerBI report with sync slicer](doc/SampleSlicerSync.pbix)

### Setting up the environment

You will first need to set up your environment as detailed [here](https://github.com/Microsoft/PowerBI-visuals/blob/master/Readme.md#setting-up-environment).

### Installing dev dependencies

Once you have cloned this example, run these commands to install dependencies and to connect the visual into powerbi.

```
npm install # This command will install all necessary modules
```

### Starting the dev app
```
pbiviz start
```

### Understanding the code
1. [Code structure](doc/CodeStructure.md)
2. Discrete selection with the PowerBI Visuals Interactivity Utils
  - [Adding the Interactivity Utils to the project](doc/AddingInteractivityUtils.md)
  - [Using the Interactivity Utils](doc/UsingInteractivityUtils.md)
3. Advanced selection with the Advanced Filter API
  - [Adding the Advanced Filter API to the project](doc/AddingAdvancedFilterAPI.md)
  - [Using the Advanced Filter API](doc/UsingAdvancedFilterAPI.md)
4. Bookmarks support
  - [Adding bookmarks support to the project](doc/AddingBookmarksSuppoprt.md)
5. Slicer synchronization support
  - [Enable synchronization for a slicer](doc/SlicerSynchronizationSupport.md)