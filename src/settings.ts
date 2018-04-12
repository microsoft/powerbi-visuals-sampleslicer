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

    export interface Settings {
        general: {
            columns: number;
            rows: number;
            rangeSelectionStart: string;
            rangeSelectionEnd: string;
            multiselect: boolean;
            selection: string;
            filter: any;
        };
        headerText: {
            marginLeft: number;
            marginTop: number;
        };
        slicerText: {
            textSize: number;
            height: number;
            width: number;
            selectedColor: string;
            hoverColor: string;
            unselectedColor: string;
            marginLeft: number;
            transparency: number;
            padding: number;
        };
        slicerItemContainer: {
            marginTop: number;
            marginLeft: number;
        };
    }

    export let defaultSettings: Settings = {
        general: {
            columns: 3,
            rows: 0,
            rangeSelectionStart: null,
            rangeSelectionEnd: null,
            multiselect: true,
            selection: null,
            filter: null
        },
        headerText: {
            marginLeft: 8,
            marginTop: 0
        },
        slicerText: {
            textSize: 10,
            height: 0,
            width: 0,
            hoverColor: '#212121',
            selectedColor: '#BDD7EE',
            unselectedColor: '#ffffff',
            marginLeft: 8,
            transparency: 0,
            padding: 3
        },
        slicerItemContainer: {
            marginTop: 5,
            marginLeft: 0,
        }
    };

    export let persistedSettingsDataViewObjectPropertyIdentifiers = {
        general: {
            multiselect: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'multiselect' },
            selection: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'selection' },
            rangeSelectionStart: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'rangeSelectionStart' },
            rangeSelectionEnd: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'rangeSelectionEnd' },
            filter: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'filter' }
        }
    };

}