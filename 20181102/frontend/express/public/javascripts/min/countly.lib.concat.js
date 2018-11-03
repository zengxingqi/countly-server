/* global google, _, jQuery*/
(function(countlyMapHelper, $) {

    // Private Properties
    var _chart,
        _dataTable,
        _chartElementId = "geo-chart",
        _chartOptions = {
            displayMode: 'region',
            colorAxis: {minValue: 0, colors: ['#D7F1D8', '#6BB96E']},
            resolution: 'countries',
            toolTip: {textStyle: {color: '#FF0000'}, showColorCode: false},
            legend: "none",
            backgroundColor: "transparent",
            datalessRegionColor: "#FFF"
        },
        _mapData = [],
        _countryMap = {};

    $.get('localization/countries/en/country.json', function(data) {
        _countryMap = data;
    });

    countlyMapHelper.drawGeoChart = function(options, locationData) {
        if (options) {
            if (options.chartElementId) {
                _chartElementId = options.chartElementId;
            }

            if (options.height) {
                _chartOptions.height = options.height;

                //preserve the aspect ratio of the chart if height is given
                _chartOptions.width = (options.height * 556 / 347);
            }
        }

        _mapData = locationData;

        if (google.visualization) {
            draw();
        }
        else {
            google.load('visualization', '1', {'packages': ['geochart'], callback: draw});
        }
    };

    //Private Methods
    /** draw function
    */
    function draw() {
        var chartData = {cols: [], rows: []};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        chartData.cols = [
            {id: 'country', label: jQuery.i18n.map["countries.table.country"], type: 'string'},
            {id: 'total', label: jQuery.i18n.map["common.total"], type: 'number'}
        ];

        chartData.rows = _.map(_mapData, function(value) {
            value.country = _countryMap[value.country] || jQuery.i18n.map["common.unknown"] || "Unknown";

            if (value.country === "European Union" || value.country === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value.value}
                    ]
                };
            }
            return {
                c: [
                    {v: value.country},
                    {v: value.value}
                ]
            };
        });

        _dataTable = new google.visualization.DataTable(chartData);

        _chartOptions.region = "world";
        _chartOptions.resolution = 'countries';
        _chartOptions.displayMode = "region";

        _chart.draw(_dataTable, _chartOptions);
    }

}(window.countlyMapHelper = window.countlyMapHelper || {}, jQuery));;/* global _, countlyGlobal, countlyCommon, app, TableTools, countlyDeviceDetails, moment, jQuery, $*/
/*
 Some helper functions to be used throughout all views. Includes custom
 popup, alert and confirm dialogs for the time being.
 */
/**
 * Some helper functions to be used throughout all views. Includes custom popup, alert and confirm dialogs for the time being.
 * @name CountlyHelpers
 * @global
 * @namespace CountlyHelpers
 */
(function(CountlyHelpers) {

    /**
    * Legacy method for displaying notifications. User {@link CountlyHelpers.notify} instead
    * @param {string} msg - msg to display
    * @returns {boolean} true - if message is not defined, else returns nothing
    */
    CountlyHelpers.parseAndShowMsg = function(msg) {
        if (!msg || !msg.length) {
            return true;
        }

        if (_.isArray(msg)) {
            msg = msg[0];
        }

        var type = "info",
            message = "",
            msgArr = msg.split("|");

        if (msgArr.length > 1) {
            type = msgArr[0];
            message = msgArr[1];
        }
        else {
            message = msg;
        }

        CountlyHelpers.notify({type: type, message: message});

        delete countlyGlobal.message;
    };
    /**
    * Display modal popup that requires confirmation input from user and optional checkbox
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {boolean} hasCheckbox - popup has checkbox? or not.
    * @param {string} checkboxTitle - title of checkbox element 
    * @param {function} callback - to determine result of the input
    * @param {array=} buttonText - [0] element for cancle button text and [1] element for confirm button text
    * @example
    * CountlyHelpers.confirmWithCheckbox("Are you sure?", "red", true, "Chechbox label text", function (result) {
    *    if (!result) {
    *        //user did not confirm, just exit
    *        return true;
    *    }
    *    //user confirmed, do what you need to do
    * });
    */
    CountlyHelpers.confirmWithCheckbox = function(msg, type, hasCheckbox, checkboxTitle, callback, buttonText) {
        var dialog = $("#cly-confirm").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);
        if (hasCheckbox) {
            dialog.find(".buttons").append("<span style='font-size:12px'><input id='popupCheckbox' type='checkbox'>" + checkboxTitle + "</span>");
        }
        if (buttonText && buttonText.length === 2) {
            dialog.find("#dialog-cancel").text(buttonText[0]);
            dialog.find("#dialog-continue").text(buttonText[1]);
        }

        dialog.addClass(type);
        revealDialog(dialog);

        dialog.find("#dialog-cancel").on('click', function() {
            callback(false);
        });

        dialog.find("#dialog-continue").on('click', function() {
            callback(true);
        });
    };

    /**
    * Display dashboard notification using Amaran JS library
    * @param {object} msg - notification message object
    * @param {string=} msg.title - title of the notification
    * @param {string=} msg.message - main notification text
    * @param {string=} msg.info - some additional information to display in notification
    * @param {number=} [msg.delay=10000] - delay time in miliseconds before displaying notification
    * @param {string=} [msg.type=ok] - message type, accepted values ok, error and warning
    * @param {string=} [msg.position=top right] - message position
    * @param {string=} [msg.sticky=false] - should message stick until closed
    * @param {string=} [msg.clearAll=false] - clear all previous notifications upon showing this one
    * @param {string=} [msg.closeOnClick=false] - should notification be automatically closed when clicked on
    * @param {function=} msg.onClick - on click listener
    * @example
    * CountlyHelpers.notify({
    *    title: "This is title",
    *    message: "Main message text",
    *    info: "Additional info"
    * });
    */
    CountlyHelpers.notify = function(msg) {
        var iconToUse;

        switch (msg.type) {
        case "error":
            iconToUse = "ion-close-circled";
            break;
        case "warning":
            iconToUse = "ion-alert-circled";
            break;
        case "yellow":
        case "blue":
        case "purple":
            iconToUse = "ion-record";
            break;
        default:
            iconToUse = "ion-checkmark-circled";
            break;
        }

        $.titleAlert((msg.title || msg.message || msg.info || "Notification"), {
            requireBlur: true,
            stopOnFocus: true,
            duration: (msg.delay || 10000),
            interval: 1000
        });
        $.amaran({
            content: {
                title: msg.title || "Notification",
                message: msg.message || "",
                info: msg.info || "",
                icon: iconToUse
            },
            theme: 'awesome ' + (msg.type || "ok"),
            position: msg.position || 'top right',
            delay: msg.delay || 10000,
            sticky: msg.sticky || false,
            clearAll: msg.clearAll || false,
            closeButton: true,
            closeOnClick: (msg.closeOnClick === false) ? false : true,
            onClick: msg.onClick || null
        });
    };

    /**
    * Display modal popup UI
    * @param {string|object} element - if third parameter isHTML is true, then HTML code as string is expected, else element's selector or element itself is expected and it's HTML contents will be copied into popup
    * @param {string=} custClass - add custom css class to dialog for easier manipulation
    * @param {boolean=} isHTML - changes the behavior of first parameter element
    * @example
    * CountlyHelpers.popup("<h1>Hello</h1>", "red", true);
    */
    CountlyHelpers.popup = function(element, custClass, isHTML) {
        var dialog = $("#cly-popup").clone();
        dialog.removeAttr("id");
        if (custClass) {
            dialog.addClass(custClass);
        }

        if (isHTML) {
            dialog.find(".content").html(element);
        }
        else {
            dialog.find(".content").html($(element).html());
        }

        revealDialog(dialog);
    };

    /**
    * Display modal popup with external resource from provided URL in iframe. Make sure to use https version of resource for it to work on both http and https dashboard
    * @param {string} url - full absolute url to external resource to display in popup
    * @example
    * CountlyHelpers.openResource("http://resources.count.ly/docs");
    */
    CountlyHelpers.openResource = function(url) {
        var dialog = $("#cly-resource").clone();
        dialog.removeAttr("id");
        dialog.find(".content").html("<iframe style='border-radius:5px; border:none; width:800px; height:600px;' src='" + url + "'></iframe>");

        revealDialog(dialog);
    };

    /**
    * Display modal alert popup for quick short messages that require immediate user's attention, as error submitting form
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {object} moreData - more data to display
    * @param {string} moreData.image - image id
    * @param {string} moreData.title - alert title
    * @example
    * CountlyHelpers.alert("Some error happened", "red");
    */
    CountlyHelpers.alert = function(msg, type, moreData) {
        var dialog = $("#cly-alert").clone();
        dialog.removeAttr("id");

        if (moreData && moreData.image) {
            dialog.find(".image").html('<div style="background-image:url(\'/images/dashboard/dialog/' + moreData.image + '.svg\')"></div>');
        }
        else {
            dialog.find(".image").css("display", "none");
        }

        if (moreData && moreData.title) {
            dialog.find(".title").html(moreData.title);
        }
        else {
            dialog.find(".title").css("display", "none");
        }

        if (moreData && moreData.button_title) {
            dialog.find("#dialog-ok").text(moreData.button_title);
            $(dialog.find("#dialog-ok")).removeAttr("data-localize");
        }

        dialog.find(".message").html(msg);

        dialog.addClass(type);
        revealDialog(dialog);
    };

    /**
    * Display modal popup that requires confirmation input from user
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {function} callback - to determine result of the input
    * @param {array=} buttonText - [0] element for cancle button text and [1] element for confirm button text
    * @param {object} moreData - more data to display
    * @param {string} moreData.image - image id
    * @param {string} moreData.title - alert title
    * @example
    * CountlyHelpers.confirm("Are you sure?", "red", function (result) {
    *    if (!result) {
    *        //user did not confirm, just exit
    *        return true;
    *    }
    *    //user confirmed, do what you need to do
    * });
    */
    CountlyHelpers.confirm = function(msg, type, callback, buttonText, moreData) {
        var dialog = $("#cly-confirm").clone();
        dialog.removeAttr("id");
        if (moreData && moreData.image) {
            dialog.find(".image").html('<div style="background-image:url(\'/images/dashboard/dialog/' + moreData.image + '.svg\')"></div>');
        }
        else {
            dialog.find(".image").css("display", "none");
        }

        if (moreData && moreData.title) {
            dialog.find(".title").html(moreData.title);
        }
        else {
            dialog.find(".title").css("display", "none");
        }
        dialog.find(".message").html(msg);

        if (buttonText && buttonText.length === 2) {
            dialog.find("#dialog-cancel").text(buttonText[0]);
            dialog.find("#dialog-continue").text(buttonText[1]);
            //because in some places they are overwritten by localizing after few seconds
            $(dialog.find("#dialog-cancel")).removeAttr("data-localize");
            $(dialog.find("#dialog-continue")).removeAttr("data-localize");
        }

        dialog.addClass(type);
        revealDialog(dialog);

        dialog.find("#dialog-cancel").on('click', function() {
            callback(false);
        });

        dialog.find("#dialog-continue").on('click', function() {
            callback(true);
        });
    };

    /**
    * Displays loading icong and returns reference to dialog so you could close it once loading is done
    * @param {string} msg - message to display in loading popup
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.loading("we are doing something");
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.loading = function(msg) {
        var dialog = $("#cly-loading").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);
        dialog.addClass('cly-loading');
        revealDialog(dialog);
        return dialog;
    };

    /**
    * Check the value which passing as parameter 
    * isJSON or not
    * return result as boolean
    * @param {object} val - value of form data
    * @returns {boolean} is this a json object?
    * @example
    * CountlyHelpers.isJSON(variable);
    */
    CountlyHelpers.isJSON = function(val) {
        try {
            JSON.parse(val);
            return true;
        }
        catch (notJSONError) {
            return false;
        }
    };

    /**
    * Displays database export dialog
    * @param {number} count - total count of documents to export
    * @param {object} data - data for export query to use when constructing url
    * @param {boolean} asDialog - open it as dialog
    * @param {boolean} exportByAPI - export from api request, export from db when set to false
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.export(300000);
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.export = function(count, data, asDialog, exportByAPI) {
        var hardLimit = countlyGlobal.config.export_limit;
        var pages = Math.ceil(count / hardLimit);
        var dialog = $("#cly-export").clone();
        var type = "csv";
        var page = 0;
        dialog.removeAttr("id");
        dialog.find(".details").text(jQuery.i18n.prop("export.export-number", (count + "").replace(/(\d)(?=(\d{3})+$)/g, '$1 '), pages));
        if (count <= hardLimit) {
            dialog.find(".cly-select").hide();
        }
        else {
            for (var i = 0; i < pages; i++) {
                dialog.find(".select-items > div").append('<div data-value="' + i + '" class="segmentation-option item">' + ((i * hardLimit + 1) + "").replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + ' - ' + (Math.min((i + 1) * hardLimit, count) + "").replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + " " + jQuery.i18n.map["export.documents"] + '</div>');
            }
            dialog.find(".export-data").addClass("disabled");
        }
        dialog.find(".button").click(function() {
            dialog.find(".button-selector .button").removeClass("selected");
            dialog.find(".button-selector .button").removeClass("active");
            $(this).addClass("selected");
            $(this).addClass("active");
            type = $(this).attr("id").replace("export-", "");
        });
        dialog.find(".segmentation-option").on("click", function() {
            page = $(this).data("value");
            dialog.find(".export-data").removeClass("disabled");
        });
        dialog.find(".export-data").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            data.type = type;
            data.limit = hardLimit;
            data.skip = page * hardLimit;
            var url = exportByAPI ? "/o/export/request" : "/o/export/db";
            var form = $('<form method="POST" action="' + url + '">');
            $.each(data, function(k, v) {
                if (CountlyHelpers.isJSON(v)) {
                    form.append($('<textarea style="visibility:hidden;position:absolute;display:none;" name="' + k + '">' + v + '</textarea>'));
                }
                else {
                    form.append($('<input type="hidden" name="' + k + '" value="' + v + '">'));
                }
            });
            $('body').append(form);
            form.submit();
        });
        if (asDialog) {
            revealDialog(dialog);
        }
        return dialog;
    };

    /**
    * Displays raw data table export dialog
    * @param {opject} dtable - data
    * @param {object} data - data for export query to use when constructing url
    * @param {boolean} asDialog - open it as dialog
    * @param {object} oSettings - oSettings object of the dataTable
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.export(300000);
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.tableExport = function(dtable, data, asDialog, oSettings) {
        /** gets file name for export
        *   @returns {string} filename
        */
        function getFileName() {
            var name = "countly";
            if ($(".widget-header .title").length) {
                name = jQuery.trim($(".widget-header .title").first().text()).replace(/[\r\n]+/g, " ").split(" ")[0];
            }
            if ($(".widget #date-selector").length) {
                //include export range
                name += "_for_" + countlyCommon.getDateRange();
            }
            else {
                //include export date
                name += +"_on_" + moment().format("DD-MMM-YYYY");
            }
            return (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
        }
        /** gets export data from data table
        * @param {object} dtable_pd - data table
        * @returns {array} table data
        */
        function getExportData(dtable_pd) {
            var tableCols = oSettings ? oSettings.aoColumns : dtable_pd.fnSettings().aoColumns,
                tableData = [];
            if (tableCols[0].sExport && app.dataExports[tableCols[0].sExport]) {
                tableData = app.dataExports[tableCols[0].sExport]();
            }
            else {
                var i = 0;
                // TableTools deprecated by offical, 
                // fix bug with workaround for export table
                TableTools.fnGetInstance = function(node) {
                    if (typeof node !== 'object') {
                        node = document.getElementById(node);
                    }
                    var iLen = TableTools._aInstances.length;
                    if (iLen > 0) {
                        for (i = iLen - 1 ; i >= 0 ; i--) {
                            if (TableTools._aInstances[i].s.master && TableTools._aInstances[i].dom.table === node) {
                                return TableTools._aInstances[i];
                            }
                        }
                    }
                    return null;
                };
                tableData = TableTools.fnGetInstance(dtable_pd[0] || oSettings.nTable).fnGetTableData({"sAction": "data", "sTag": "default", "sLinerTag": "default", "sButtonClass": "DTTT_button_xls", "sButtonText": "Save for Excel", "sTitle": "", "sToolTip": "", "sCharSet": "utf16le", "bBomInc": true, "sFileName": "*.csv", "sFieldBoundary": "", "sFieldSeperator": "\t", "sNewLine": "auto", "mColumns": "all", "bHeader": true, "bFooter": true, "bOpenRows": false, "bSelectedOnly": false, "fnMouseover": null, "fnMouseout": null, "fnSelect": null, "fnComplete": null, "fnInit": null, "fnCellRender": null, "sExtends": "xls"});
                tableData = tableData.split(/\r\n|\r|\n/g);
                tableData.shift();

                for (i = 0; i < tableData.length; i++) {
                    tableData[i] = tableData[i].split('\t');
                }
                var retData = [];
                for (i = 0; i < tableData.length; i++) {
                    var ob = {};
                    for (var colIndex = 0; colIndex < tableCols.length; colIndex++) {
                        try {
                            if (!(tableData[i] && tableData[i][colIndex])) {
                                continue;
                            }
                            if (tableCols[colIndex].sType === "formatted-num") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].replace(/,/g, "");
                            }
                            else if (tableCols[colIndex].sType === "percent") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].replace("%", "");
                            }
                            else if (tableCols[colIndex].sType === "format-ago" || tableCols[colIndex].sType === "event-timeline") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].split("|").pop();
                            }
                            else {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex];
                            }
                        }
                        catch (e) {
                            //not important
                        }
                    }
                    retData.push(ob);
                }
                tableData = retData;
            }
            return tableData;
        }
        var dialog = $("#cly-export").clone();
        var type = "csv";
        dialog.removeAttr("id");
        dialog.find(".details").hide();
        dialog.find(".cly-select").hide();
        dialog.find(".button").click(function() {
            dialog.find(".button-selector .button").removeClass("selected");
            dialog.find(".button-selector .button").removeClass("active");
            $(this).addClass("selected");
            $(this).addClass("active");
            type = $(this).attr("id").replace("export-", "");
        });
        dialog.find(".export-data").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            data.type = type;
            data.data = JSON.stringify(getExportData(dtable, type));
            data.filename = getFileName(type);
            var url = "/o/export/data";
            var form = $('<form method="POST" action="' + url + '">');

            $.each(data, function(k, v) {
                if (CountlyHelpers.isJSON(v)) {
                    form.append($('<textarea style="visibility:hidden;position:absolute;display:none;" name="' + k + '">' + v + '</textarea>'));
                }
                else {
                    form.append($('<input type="hidden" name="' + k + '" value="' + v + '">'));
                }
            });
            $('body').append(form);
            form.submit();
        });
        if (asDialog) {
            revealDialog(dialog);
        }
        return dialog;
    };

    /**
    * Instead of creating dialog object you can use this method and directly pass jquery element to be used as dialog content, which means complete customization
    * @param {jquery_object} dialog - jQuery object unnattached, like cloned existing object
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    */
    CountlyHelpers.revealDialog = function(dialog) {
        $("body").append(dialog);
        var dialogHeight = dialog.outerHeight(),
            dialogWidth = dialog.outerWidth() + 2;

        dialog.css({
            "height": dialogHeight,
            "margin-top": Math.floor(-dialogHeight / 2),
            "width": dialogWidth,
            "margin-left": Math.floor(-dialogWidth / 2)
        });

        $("#overlay").fadeIn();
        dialog.fadeIn(app.tipsify.bind(app, $("#help-toggle").hasClass("active"), dialog));
    };

    /**
    * If contents of the popup change, you may want to resice the popup
    * @param {jquery_object} dialog - jQuery dialog reference
    * @param {boolean} animate - should resizing be animated
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    * //when content changes
    * CountlyHelpers.changeDialogHeight(dialog, true)
    */
    CountlyHelpers.changeDialogHeight = function(dialog, animate) {
        var dialogHeight = 0,
            dialogWidth = dialog.width(),
            maxHeight = $("#sidebar").height() - 40;

        dialog.children().each(function() {
            dialogHeight += $(this).outerHeight(true);
        });

        if (dialogHeight > maxHeight) {
            dialog[animate ? 'animate' : 'css']({
                "height": maxHeight,
                "margin-top": Math.floor(-maxHeight / 2),
                "width": dialogWidth,
                "margin-left": Math.floor(-dialogWidth / 2),
                "overflow-y": "auto"
            });
        }
        else {
            dialog[animate ? 'animate' : 'css']({
                "height": dialogHeight,
                "margin-top": Math.floor(-dialogHeight / 2),
                "width": dialogWidth,
                "margin-left": Math.floor(-dialogWidth / 2)
            });
        }
    };

    var revealDialog = CountlyHelpers.revealDialog;

    //var changeDialogHeight = CountlyHelpers.changeDialogHeight; - not used anywhere anymore

    /**
    * Remove existing dialog
    * @param {jquery_object} dialog - jQuery dialog reference
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    * //when dialog not needed anymore
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.removeDialog = function(dialog) {
        dialog.remove();
        $("#overlay").fadeOut();
    };

    CountlyHelpers.setUpDateSelectors = function(self) {
        $("#month").text(moment().year());
        $("#day").text(moment().format("MMM"));
        $("#yesterday").text(moment().subtract(1, "days").format("Do"));

        $("#date-selector").find(".date-selector").click(function() {
            if ($(this).hasClass("selected")) {
                return true;
            }

            self.dateFromSelected = null;
            self.dateToSelected = null;

            $(".date-selector").removeClass("selected").removeClass("active");
            $(this).addClass("selected");
            var selectedPeriod = $(this).attr("id");

            if (countlyCommon.getPeriod() === selectedPeriod) {
                return true;
            }

            countlyCommon.setPeriod(selectedPeriod);

            self.dateChanged(selectedPeriod);

            $("#" + selectedPeriod).addClass("active");
        });

        $("#date-selector").find(".date-selector").each(function() {
            if (countlyCommon.getPeriod() === $(this).attr("id")) {
                $(this).addClass("active").addClass("selected");
            }
        });
    };

    /**
    * Initialize countly dropdown select. In most cases it is done automatically, only in some cases, when content loaded via ajax request outside of view lifecycle, you may need to initialize it yourself for your content specifically
    * @param {object} element - jQuery object reference
    * @example
    * CountlyHelpers.initializeSelect($("#my-dynamic-div"));
    */
    CountlyHelpers.initializeSelect = function(element) {
        element = element || $("body");

        element.off("click", ".cly-select").on("click", ".cly-select", function(e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            $(this).removeClass("req");

            var selectItems = $(this).find(".select-items"),
                itemCount = selectItems.find(".item").length;

            if (!selectItems.length) {
                return false;
            }

            $(".cly-select").find(".search").remove();

            if (selectItems.is(":visible")) {
                $(this).removeClass("active");
            }
            else {
                $(".cly-select").removeClass("active");
                $(".select-items").hide();
                $(this).addClass("active");

                if (itemCount > 10 || $(this).hasClass("big-list")) {
                    $("<div class='search'><div class='inner'><input type='text' /><i class='fa fa-search'></i></div></div>").insertBefore($(this).find(".select-items"));
                }
            }

            if ($(this).hasClass("centered")) {
                if ((itemCount > 5 && $(this).offset().top > 400) || $(this).hasClass("force")) {
                    var height = $(this).find(".select-items").height(),
                        searchItem = $(this).find(".search");

                    var addThis = 0;

                    if (searchItem.length) {
                        addThis = (searchItem.height() / 2).toFixed(0) - 1;
                        $(this).find(".select-items").css({"min-height": height});
                    }
                    else {
                        $(this).find(".select-items").css({"min-height": "auto"});
                        height = $(this).find(".select-items").height();
                    }

                    $(this).find(".select-items").css("margin-top", (-(height / 2).toFixed(0) - ($(this).height() / 2).toFixed(0) + parseInt(addThis)) + "px");
                    $(this).find(".search").css("margin-top", (-(height / 2).toFixed(0) - searchItem.height()) + "px");
                }
                else {
                    $(this).find(".select-items").css({"min-height": "auto"});
                    $(this).find(".select-items").css("margin-top", '');
                    $(this).find(".search").css("margin-top", '');
                }
            }

            if ($(this).find(".select-items").is(":visible")) {
                $(this).find(".select-items").hide();
            }
            else {
                $(this).find(".select-items").show();
                if ($(this).find(".select-items").find(".scroll-list").length === 0) {
                    $(this).find(".select-items").wrapInner("<div class='scroll-list'></div>");
                    $(this).find(".scroll-list").slimScroll({
                        height: '100%',
                        start: 'top',
                        wheelStep: 10,
                        position: 'right',
                        disableFadeOut: true
                    });
                }
            }

            $(this).find(".select-items").find(".item").removeClass("hidden");
            $(this).find(".select-items").find(".group").show();
            $(this).find(".select-items").find(".item").removeClass("last");
            $(this).find(".select-items").find(".item:visible:last").addClass("last");

            $(this).find(".search input").focus();

            $("#date-picker").hide();

            $(this).find(".search").off("click").on("click", function(e1) {
                e1.stopPropagation();
            });

            e.stopPropagation();
        });

        element.off("click", ".cly-select .select-items .item").on("click", ".cly-select .select-items .item", function() {
            var selectedItem = $(this).parents(".cly-select").find(".text");
            selectedItem.text($(this).text());
            selectedItem.data("value", $(this).data("value"));

            $(this).parents(".cly-select").trigger("cly-select-change", [$(this).data("value")]);
        });

        element.off("keyup", ".cly-select .search input").on("keyup", ".cly-select .search input", function() {
            if (!$(this).val()) {
                $(this).parents(".cly-select").find(".item").removeClass("hidden");
                $(this).parents(".cly-select").find(".group").show();
            }
            else {
                $(this).parents(".cly-select").find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $(this).parents(".cly-select").find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
                var prevHeader = $(this).parents(".cly-select").find(".group").first();
                prevHeader.siblings().each(function() {
                    if ($(this).hasClass("group")) {
                        if (prevHeader) {
                            prevHeader.hide();
                        }
                        prevHeader = $(this);
                    }
                    else if ($(this).hasClass("item") && $(this).is(":visible")) {
                        prevHeader = null;
                    }

                    if (!$(this).next().length && prevHeader) {
                        prevHeader.hide();
                    }
                });
            }
        });

        element.off('mouseenter').on('mouseenter', ".cly-select .item", function() {
            var item = $(this);

            if (this.offsetWidth < this.scrollWidth && !item.attr('title')) {
                item.attr('title', item.text());
            }
        });

        $(window).click(function() {
            var $clySelect = $(".cly-select");

            $clySelect.find(".select-items").hide();
            $clySelect.find(".search").remove();
            $clySelect.removeClass("active");
        });

        $.fn.clySelectSetItems = function(items) {
            var $selectItems = $(this).find(".select-items");

            if ($selectItems) {
                $selectItems.html("");

                for (var i = 0; i < items.length; i++) {
                    $selectItems.append('<div data-value="' + items[i].value + '" class="item">' + items[i].name + '</div>');
                }
            }
        };

        $.fn.clySelectGetSelection = function() {
            return $(this).find(".select-inner .text").data("value") || null;
        };

        $.fn.clySelectSetSelection = function(value, name) {
            $(this).find(".select-inner .text").data("value", value);
            $(this).find(".select-inner .text").text(name);
            $(this).trigger("cly-select-change", [value]);
        };
    };

    /**
    * Initialize countly dropdown multi select. In most cases it is done automatically, only in some cases, when content loaded via ajax request outside of view lifecycle, you may need to initialize it yourself for your content specifically
    * @param {object} element - jQuery object reference
    * @example
    * CountlyHelpers.initializeMultiSelect($("#my-dynamic-div"));
    */
    CountlyHelpers.initializeMultiSelect = function(element) {
        element = element || $("body");

        element.off("click", ".cly-multi-select").on("click", ".cly-multi-select", function(e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            $(this).removeClass("req");

            var selectItems = $(this).find(".select-items"),
                itemCount = selectItems.find(".item").length;

            if (!selectItems.length) {
                return false;
            }

            $(".cly-multi-select").find(".search").remove();

            if (selectItems.is(":visible")) {
                $(this).removeClass("active");
            }
            else {
                $(".cly-multi-select").removeClass("active");
                $(".select-items").hide();
                $(this).addClass("active");

                if (itemCount > 10) {
                    $("<div class='search'><div class='inner'><input type='text' /><i class='fa fa-search'></i></div></div>").insertBefore($(this).find(".select-items"));
                }
            }

            if ($(this).find(".select-items").is(":visible")) {
                $(this).find(".select-items").hide();
            }
            else {
                $(this).find(".select-items").show();
                if ($(this).find(".select-items").find(".scroll-list").length === 0) {
                    $(this).find(".select-items").wrapInner("<div class='scroll-list'></div>");
                    $(this).find(".scroll-list").slimScroll({
                        height: '100%',
                        start: 'top',
                        wheelStep: 10,
                        position: 'right',
                        disableFadeOut: true
                    });
                }
            }

            $(this).find(".select-items").find(".item").removeClass("hidden");
            $(this).find(".select-items").find(".group").show();
            $(this).find(".select-items").find(".item").removeClass("last");
            $(this).find(".select-items").find(".item:visible:last").addClass("last");

            $(this).find(".search input").focus();

            $("#date-picker").hide();

            $(this).find(".search").off("click").on("click", function(e1) {
                e1.stopPropagation();
            });

            e.stopPropagation();
        });

        element.off("click", ".cly-multi-select .select-items .item").on("click", ".cly-multi-select .select-items .item", function(e) {
            if ($(this).hasClass("disabled")) {
                e.stopPropagation();
                return;
            }

            var $multiSelect = $(this).parents(".cly-multi-select"),
                selectionContainer = $multiSelect.find(".text"),
                selectedValue = $(this).data("value"),
                maxToSelect = $multiSelect.data("max");

            if ($(this).hasClass("selected")) {
                selectionContainer.find(".selection[data-value='" + selectedValue + "']").remove();
                $(this).removeClass("selected");
            }
            else {
                var $selection = $("<div class='selection'></div>");

                $selection.text($(this).text());
                $selection.attr("data-value", selectedValue);
                $selection.append("<div class='remove'><i class='ion-android-close'></i></div>");

                selectionContainer.append($selection);

                $(this).addClass("selected");
            }

            if (maxToSelect) {
                if (getSelected($multiSelect).length >= maxToSelect) {
                    $multiSelect.find(".item").addClass("disabled");
                }
            }

            if ($multiSelect.find(".item.selected").length > 0) {
                $multiSelect.addClass("selection-exists");
            }
            else {
                $multiSelect.removeClass("selection-exists");
            }

            $multiSelect.data("value", getSelected($multiSelect));
            $multiSelect.trigger("cly-multi-select-change", [getSelected($multiSelect)]);
            e.stopPropagation();
        });

        element.off("keyup", ".cly-multi-select .search input").on("keyup", ".cly-multi-select .search input", function() {
            var $multiSelect = $(this).parents(".cly-multi-select");

            if (!$(this).val()) {
                $multiSelect.find(".item").removeClass("hidden");
                $multiSelect.find(".group").show();
            }
            else {
                $multiSelect.find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $multiSelect.find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
                var prevHeader = $multiSelect.find(".group").first();
                prevHeader.siblings().each(function() {
                    if ($(this).hasClass("group")) {
                        if (prevHeader) {
                            prevHeader.hide();
                        }
                        prevHeader = $(this);
                    }
                    else if ($(this).hasClass("item") && $(this).is(":visible")) {
                        prevHeader = null;
                    }

                    if (!$(this).next().length && prevHeader) {
                        prevHeader.hide();
                    }
                });
            }
        });

        element.off('mouseenter').on('mouseenter', ".cly-multi-select .item", function() {
            var item = $(this);

            if (this.offsetWidth < this.scrollWidth && !item.attr('title')) {
                item.attr('title', item.text());
            }
        });

        element.off("click", ".cly-multi-select .selection").on("click", ".cly-multi-select .selection", function(e) {
            e.stopPropagation();
        });

        element.off("click", ".cly-multi-select .selection .remove").on("click", ".cly-multi-select .selection .remove", function(e) {
            var $multiSelect = $(this).parents(".cly-multi-select");

            $multiSelect.find(".item[data-value='" + $(this).parent(".selection").data("value") + "']").removeClass("selected");

            if ($multiSelect.find(".item.selected").length > 0) {
                $multiSelect.addClass("selection-exists");
            }
            else {
                $multiSelect.removeClass("selection-exists");
            }

            $(this).parent(".selection").remove();

            var maxToSelect = $multiSelect.data("max");

            if (maxToSelect) {
                if (getSelected($multiSelect).length < maxToSelect) {
                    $multiSelect.find(".item").removeClass("disabled");
                }
            }

            $multiSelect.data("value", getSelected($multiSelect));
            $multiSelect.trigger("cly-multi-select-change", [getSelected($multiSelect)]);

            e.stopPropagation();
        });

        $(window).click(function() {
            var $clyMultiSelect = $(".cly-multi-select");

            $clyMultiSelect.find(".select-items").hide();
            $clyMultiSelect.find(".search").remove();
            $clyMultiSelect.removeClass("active");
        });
        /** get selected from multi select
        * @param {object} multiSelectEl multi select element
        * @returns {array} array of selected values
        */
        function getSelected(multiSelectEl) {
            var selected = [];

            multiSelectEl.find(".text .selection").each(function() {
                selected.push($(this).data("value"));
            });

            return selected;
        }

        $.fn.clyMultiSelectSetItems = function(items) {
            var $selectItems = $(this).find(".select-items");

            if ($selectItems) {
                $selectItems.html("");

                for (var i = 0; i < items.length; i++) {
                    $selectItems.append('<div data-value="' + items[i].value + '" class="item">' + items[i].name + '</div>');
                }
            }
        };

        $.fn.clyMultiSelectGetSelection = function() {
            return getSelected($(this));
        };

        $.fn.clyMultiSelectSetSelection = function(valNameArr) {
            var $multiSelect = $(this),
                $selectionContainer = $multiSelect.find(".text");

            $(this).find(".selection").remove();

            for (var i = 0; i < valNameArr.length; i++) {
                var name = valNameArr[i].name,
                    value = valNameArr[i].value;

                var $selection = $("<div class='selection'></div>");

                $selection.text(name);
                $selection.attr("data-value", value);
                $selection.append("<div class='remove'><i class='ion-android-close'></i></div>");

                $selectionContainer.append($selection);
            }

            $(this).addClass("selection-exists");
            $(this).data("value", getSelected($(this)));
            $(this).trigger("cly-multi-select-change", [getSelected($(this))]);
        };

        $.fn.clyMultiSelectClearSelection = function() {
            $(this).find(".selection").remove();
            $(this).data("value", getSelected($(this)));
            $(this).removeClass("selection-exists");
            $(this).trigger("cly-multi-select-change", [getSelected($(this))]);
        };
    };

    /**
    * Initialize dropdown options list usually used on datatables. Firstly you need to add list with class 'cly-button-menu' to your template or add it in the view. Additionally you can add class `dark` to use dark theme.
    * After that datatables last column for options should return a element with `cly-list-options` class and should have cell classes shrink and right and should not be sortable
    * Then call this method in your view and you can start listening to events like: 
    * cly-list.click - when your cly-list-options element is clicked, passing click event as data
    * cly-list.open - when list is opened, passing click event as data
    * cly-list.close - when list is closed, passing click event as data
    * cly-list.item - when item is clicked, passing click event as data
    * @param {object} element - jQuery object reference for container
    * @example <caption>Adding list to HTML template</caption>
    * <div class="cly-button-menu dark cohorts-menu" tabindex="1">
    *     <a class="item delete-cohort" data-localize='common.delete'></a>
    *     <a class="item view-cohort" data-localize='cohorts.view-users'></a>
    * </div>
    * @example <caption>Creating last column in datatables</caption>
    * { "mData": function(row, type){
    *     return '<a class="cly-list-options"></a>';
    * }, "sType":"string", "sTitle": "", "sClass":"shrink center", bSortable: false  }
    * @example <caption>Listening to events</caption>
    * $(".cly-button-menu").on("cly-list.click", function(event, data){
    *     var id = $(data.target).parents("tr").data("id");
    * });
    */
    CountlyHelpers.initializeTableOptions = function(element) {
        element = element || $('body');
        element.find("tbody").off("click", ".cly-list-options").on("click", ".cly-list-options", function(event) {
            event.stopPropagation();
            event.preventDefault();
            $(".cly-button-menu").trigger('cly-list.click', event);
            $(event.target).toggleClass("active");
            if ($(event.target).hasClass("active")) {
                element.find(".cly-list-options").removeClass("active");
                $(event.target).addClass("active");
                var pos = $(event.target).offset();
                element.find('.cly-button-menu').css({
                    top: (pos.top + 25) + "px",
                    right: 22 + "px"
                });
                element.find('.cly-button-menu').addClass("active");
                element.find('.cly-button-menu').focus();
                $(".cly-button-menu").trigger('cly-list.open', event);
            }
            else {
                $(event.target).removeClass("active");
                element.find('.cly-button-menu').removeClass("active");
                $(".cly-button-menu").trigger('cly-list.close', event);
            }
            return false;
        });

        element.find('.cly-button-menu .item').off("click").on("click", function(event) {
            $(".cly-button-menu").trigger('cly-list.item', event);
            element.find('.cly-button-menu').removeClass("active");
            element.find(".cly-list-options").removeClass("active");
            $(".cly-button-menu").trigger('cly-list.close', event);
        });

        element.find('.cly-button-menu').off("blur").on("blur", function() {
            element.find('.cly-button-menu').removeClass("active");
            element.find(".cly-list-options").removeClass("active");
            $(".cly-button-menu").trigger('cly-list.close', event);
        });
    };

    /**
    * Refresh existing datatable instance on view refresh, providing new data
    * @param {object} dTable - jQuery object datatable reference
    * @param {object} newDataArr - array with new data in same format as provided while initializing table
    * @example
    * CountlyHelpers.refreshTable(self.dtable, data);
    */
    CountlyHelpers.refreshTable = function(dTable, newDataArr) {
        var oSettings = dTable.fnSettings();
        dTable.fnClearTable(false);

        if (newDataArr && newDataArr.length) {
            for (var i = 0; i < newDataArr.length; i++) {
                dTable.oApi._fnAddData(oSettings, newDataArr[i]);
            }
        }

        oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
        dTable.fnStandingRedraw();
        dTable.trigger("table.refresh");
    };

    /**
    * In some cases you may want to allow expanding rows of your datatable. To do that you must add unique id to each row via datatables fnRowCallback property
    * @param {object} dTable - jQuery object datatable reference
    * @param {function} getData - callback function to be called when clicking ont he row. This function will receive original row data object you passed to data tables and should return HTML string to display in subcell
    * @param {object} context - this context if needed, which will be passed to getData function as second parameter
    * @example
    * function formatData(data){
    *    // `data` is the original data object for the row
    *    //return string to display in subcell
    *    var str = '';
	*	if(data){
	*		str += '<div class="datatablesubrow">'+
    *        JSON.stringify(data)+
    *        '</div>';
    *    }
    *    return str;
    * }
    * this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
    *      "aaData": crashData.data,
	*		"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
	*			$(nRow).attr("id", aData._id);
	*		},
    *      "aoColumns": [
	*			{ "mData": "ts"}, "sType":"format-ago", "sTitle": jQuery.i18n.map["crashes.crashed"]},
	*			{ "mData": "os", "sType":"string", "sTitle": jQuery.i18n.map["crashes.os_version"] },
	*			{ "mData": "device"}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.device"]},
	*			{ "mData": "app_version", "sType":"string", "sTitle": jQuery.i18n.map["crashes.app_version"] }
    *      ]
    *  }));
    *  CountlyHelpers.expandRows(this.dtable, formatData);
    */
    CountlyHelpers.expandRows = function(dTable, getData, context) {
        dTable.aOpen = [];
        dTable.on("click", "tr", function() {
            var nTr = this;
            var id = $(nTr).attr("id");
            if (id) {
                var i = $.inArray(id, dTable.aOpen);

                if (i === -1) {
                    $(nTr).addClass("selected");
                    var nDetailsRow = dTable.fnOpen(nTr, getData(dTable.fnGetData(nTr), context), 'details');
                    $('div.datatablesubrow', nDetailsRow).show();
                    dTable.aOpen.push(id);
                    dTable.trigger("row.open", id);
                }
                else {
                    $(nTr).removeClass("selected");
                    $('div.datatablesubrow', $(nTr).next()[0]).hide();
                    dTable.fnClose(nTr);
                    dTable.aOpen.splice(i, 1);
                    dTable.trigger("row.close", id);
                }
                var expandIcon = $(nTr).find(".expand-row-icon");
                if (expandIcon.length === 1) {
                    expandIcon.text("keyboard_arrow_" + ((i === -1) ? "up" : "down"));
                }
            }
        });
    };


    CountlyHelpers.expandRowIconColumn = function() {
        return {
            "mData":
            function() {
                return '<i class="material-icons expand-row-icon">  keyboard_arrow_down  </i>';
            },
            "sType": "string",
            "sTitle": '',
            "bSortable": false,
            'sWidth': '1px'
        };
    };

    /**
    * If you allow to open/expand rows, then when refreshing table they will close again. To avoid that you must call this function on each refresh after calling {@link CountlyHelpers.refreshTable}
    * @param {object} dTable - jQuery object datatable reference
    * @param {function} getData - callback function to be called when clicking ont he row. This function will receive original row data object you passed to data tables and should return HTML string to display in subcell
    * @param {object} context - this context if needed, which will be passed to getData function as second parameter
    * @example
    * CountlyHelpers.refreshTable(self.dtable, data);
    * CountlyHelpers.reopenRows(self.dtable, formatData);
    */
    CountlyHelpers.reopenRows = function(dTable, getData, context) {
        var nTr;
        if (dTable.aOpen) {
            $.each(dTable.aOpen, function(i, id) {
                nTr = $("#" + id)[0];
                $(nTr).addClass("selected");
                var nDetailsRow = dTable.fnOpen(nTr, getData(dTable.fnGetData(nTr), context), 'details');
                $('div.datatablesubrow', nDetailsRow).show();
                dTable.trigger("row.reopen", id);
            });
        }
    };

    /**
    * Close all opened datatables rows
    * @param {object} dTable - jQuery object datatable reference
    * @example
    * CountlyHelpers.closeRows(self.dtable);
    */
    CountlyHelpers.closeRows = function(dTable) {
        if (dTable.aOpen) {
            $.each(dTable.aOpen, function(i, id) {
                var nTr = $("#" + id)[0];
                $(nTr).removeClass("selected");
                $('div.datatablesubrow', $(nTr).next()[0]).slideUp(function() {
                    dTable.fnClose(nTr);
                    dTable.aOpen.splice(i, 1);
                });
                dTable.trigger("row.close", id);
            });
        }
    };

    /**
    * Convert array of app ids to comma separate string of app names
    * @param {array} context - array with app ids
    * @returns {string} list of app names (appname1, appname2)
    * @example
    * //outputs Test1, Test2, Test3
    * CountlyHelpers.appIdsToNames(["586e3216326a8b0a07b8d87f", "586e339a326a8b0a07b8ecb9", "586e3343c32cb30a01558cc3"]);
    */
    CountlyHelpers.appIdsToNames = function(context) {
        var ret = "";

        for (var i = 0; i < context.length; i++) {
            if (!context[i]) {
                continue;
            }
            else if (!countlyGlobal.apps[context[i]]) {
                ret += 'deleted app';
            }
            else {
                ret += countlyGlobal.apps[context[i]].name;
            }

            if (context.length > 1 && i !== context.length - 1) {
                ret += ", ";
            }
        }

        return ret;
    };

    /**
    * Load JS file
    * @param {string} js - path or url to js file
    * @param {callback=} callback - callback when file loaded
    * @example
    * CountlyHelpers.loadJS("/myplugin/javascripts/custom.js");
    */
    CountlyHelpers.loadJS = function(js, callback) {
        var fileref = document.createElement('script'),
            loaded;
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", js);
        if (callback) {
            fileref.onreadystatechange = fileref.onload = function() {
                if (!loaded) {
                    callback();
                }
                loaded = true;
            };
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    };

    /**
    * Load CSS file
    * @param {string} css - path or url to css file
    * @param {callback=} callback - callback when file loaded
    * @example
    * CountlyHelpers.loadCSS("/myplugin/stylesheets/custom.css");
    */
    CountlyHelpers.loadCSS = function(css, callback) {
        var fileref = document.createElement("link"),
            loaded;
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", css);
        if (callback) {
            fileref.onreadystatechange = fileref.onload = function() {
                if (!loaded) {
                    callback();
                }
                loaded = true;
            };
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    };

    CountlyHelpers.messageText = function(messagePerLocale) {
        if (!messagePerLocale) {
            return '';
        }
        else if (messagePerLocale.default) {
            return messagePerLocale.default;
        }
        else if (messagePerLocale.en) {
            return messagePerLocale.en;
        }
        else {
            for (var locale in messagePerLocale) {
                return messagePerLocale[locale];
            }
        }
        return '';
    };
    /**
    * Creates function to be used as mRender for datatables to clip long values
    * @param {function=} f - optional function to change passed data to render and return changed object
    * @param {string=} nothing - text to display in cellS
    * @returns {function} to be used as mRender for datatables to clip long values
    */
    CountlyHelpers.clip = function(f, nothing) {
        return function(opt) {
            var res = typeof f === 'function' ? f(opt) : opt;
            return '<div class="clip' + (res ? '' : ' nothing') + '">' + (res || nothing) + '</div>';
        };
    };

    /**
    * Create Countly metric model to fetch metric data from server and provide it to views
    * @param {object} countlyMetric - initial metric object if you want to pre provide some methods, etc
    * @param {string} metric - metric name to retrieve from server
    * @param {jquery} $ - local jquery reference
    * @param {function=} fetchValue - default function to fetch and transform if needed value from standard metric model
    * @example
    *   window.countlyDensity = {};
    *   countlyDensity.checkOS = function(os, density){
    *        var lastIndex = density.toUpperCase().lastIndexOf("DPI");
    *        if(os.toLowerCase() == "android" && lastIndex !== -1 && lastIndex === density.length - 3)
    *            return true;
    *        if(os.toLowerCase() == "ios" && density[0] == "@")
    *            return true;
    *        return false;
    *   };
    *   CountlyHelpers.createMetricModel(window.countlyDensity, {name: "density", estOverrideMetric: "densities"}, jQuery, function(val, data, separate){
    *        if(separate){
    *            //request separated/unprocessed data
    *            return val;
    *        }
    *        else{
    *            //we can preprocess data and group, for example, by first letter
    *            return val[0];
    *        }
    *   });
    */
    CountlyHelpers.createMetricModel = function(countlyMetric, metric, $, fetchValue) {
        countlyMetric = countlyMetric || {};
        countlyMetric.fetchValue = fetchValue;
        //Private Properties
        var _Db = {},
            _metrics = {},
            _activeAppKey = 0,
            _initialized = false,
            _processed = false,
            _period = null,
            _name = (metric.name) ? metric.name : metric,
            _estOverrideMetric = (metric.estOverrideMetric) ? metric.estOverrideMetric : "";

        /**
        * Common metric object, all metric models inherit from it and should have these methods
        * @name countlyMetric
        * @global
        * @namespace countlyMetric
        */

        //Public Methods
        /**
        * Initialize metric model to fetch initial data from server
        * @param {boolean=} processed - if true will fetch processed data, will fetch raw data by default
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        * beforeRender: function() {
        *    return $.when(countlyMetric.initialize()).then(function () {});
        * }
        */
        countlyMetric.initialize = function(processed) {
            if (_initialized && _period === countlyCommon.getPeriodForAjax() && _activeAppKey === countlyCommon.ACTIVE_APP_KEY) {
                return this.refresh();
            }

            _period = countlyCommon.getPeriodForAjax();

            if (!countlyCommon.DEBUG) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                _initialized = true;

                if (processed) {
                    _processed = true;
                    return $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/analytics/metric",
                        data: {
                            "api_key": countlyGlobal.member.api_key,
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "metric": _name,
                            "period": _period
                        },
                        success: function(json) {
                            _Db = json;
                            if (countlyMetric.callback) {
                                countlyMetric.callback(false, json);
                            }
                        }
                    });
                }
                else {
                    return $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "api_key": countlyGlobal.member.api_key,
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "method": _name,
                            "period": _period
                        },
                        success: function(json) {
                            _Db = json;
                            setMeta();
                            if (countlyMetric.callback) {
                                countlyMetric.callback(false, json);
                            }
                        }
                    });
                }
            }
            else {
                _Db = {"2012": {}};
                if (countlyMetric.callback) {
                    countlyMetric.callback(false, _Db);
                }
                return true;
            }
        };

        /**
        * Refresh metric model by fetching data only for the latest time bucket using action=refresh on server. Currently does not fetch data for processed data loaded on initialization
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        *$.when(countlyMetric.refresh()).then(function () {
        *    //data loaded, do something
        *});
        */
        countlyMetric.refresh = function() {
            if (!countlyCommon.DEBUG) {

                if (_activeAppKey !== countlyCommon.ACTIVE_APP_KEY) {
                    _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                    return this.initialize();
                }

                if (_processed) {
                    if (countlyMetric.callback) {
                        countlyMetric.callback(true);
                    }
                }
                else {
                    return $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "api_key": countlyGlobal.member.api_key,
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "method": _name,
                            "action": "refresh"
                        },
                        success: function(json) {
                            countlyCommon.extendDbObj(_Db, json);
                            extendMeta();
                            if (countlyMetric.callback) {
                                countlyMetric.callback(true, json);
                            }
                        }
                    });
                }
            }
            else {
                _Db = {"2012": {}};
                if (countlyMetric.callback) {
                    countlyMetric.callback(true, _Db);
                }
                return true;
            }
        };

        /**
        * Callback that each metric model can define, to be called when data is loaded or refreshed
        * @example
        *countlyDeviceDetails.callback = function(isRefresh, data){
        *    if(isRefresh){
        *        countlyAppVersion.refresh(data);
        *    }
        *    else{
        *        countlyAppVersion.initialize();
        *    }
        *};
        */
        countlyMetric.callback;

        /**
        * Reset/delete all retrieved metric data, like when changing app or selected time period
        */
        countlyMetric.reset = function() {
            if (_processed) {
                _Db = [];
            }
            else {
                _Db = {};
                setMeta();
            }
        };

        /**
        * Get current data, if some view or model requires access to raw data
        * @return {object} raw data returned from server either in standard metric model or preprocessed data, based on what model uses
        */
        countlyMetric.getDb = function() {
            return _Db;
        };

        /**
        * Set current data for model, if you need to provide data for model from another resource (as loaded in different model)
        * @param {object} db - set new data to be used by model
        */
        countlyMetric.setDb = function(db) {
            _Db = db;
            setMeta();
        };

        /**
        * Extend current data for model with some additional information about latest period (like data from action=refresh request)
        * @param {object} data - set new data to be used by model
        */
        countlyMetric.extendDb = function(data) {
            countlyCommon.extendDbObj(_Db, data);
            extendMeta();
        };

        /**
        * Get array of unique segments available for metric data
        * @param {string} metric1 - name of the segment/metric to get meta for, by default will use default _name provided on initialization
        * @returns {array} array of unique metric values
        */
        countlyMetric.getMeta = function(metric1) {
            metric1 = metric1 || _name;
            return _metrics[metric1] || [];
        };

        /**
        * Get data after initialize finished and data was retrieved
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {boolean} join - join new and total users into single graph, for example to dispaly in bars on the same graph and not 2 separate pie charts
        * @param {string} metric1 - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {object} chartData
        * @example <caption>Example output of separate data for 2 pie charts</caption>
        *{"chartData":[
        *    {"langs":"English","t":124,"u":112,"n":50},
        *    {"langs":"Italian","t":83,"u":74,"n":30},
        *    {"langs":"German","t":72,"u":67,"n":26},
        *    {"langs":"Japanese","t":62,"u":61,"n":19},
        *    {"langs":"French","t":66,"u":60,"n":28},
        *    {"langs":"Korean","t":64,"u":58,"n":26}
        *],
        *"chartDPTotal":{
        *    "dp":[
        *        {"data":[[0,124]],"label":"English"},
        *        {"data":[[0,83]],"label":"Italian"},
        *        {"data":[[0,72]],"label":"German"},
        *        {"data":[[0,62]],"label":"Japanese"},
        *        {"data":[[0,66]],"label":"French"},
        *        {"data":[[0,64]],"label":"Korean"}
        *    ]
        *},
        *"chartDPNew":{
        *    "dp":[
        *        {"data":[[0,50]],"label":"English"},
        *        {"data":[[0,30]],"label":"Italian"},
        *        {"data":[[0,26]],"label":"German"},
        *        {"data":[[0,19]],"label":"Japanese"},
        *        {"data":[[0,28]],"label":"French"},
        *        {"data":[[0,26]],"label":"Korean"}
        *    ]
        *}}
        * @example <caption>Example output of joined data for 1 bar chart</caption>
        *{"chartData":[
        *    {"langs":"English","t":124,"u":112,"n":50},
        *    {"langs":"Italian","t":83,"u":74,"n":30},
        *    {"langs":"German","t":72,"u":67,"n":26},
        *    {"langs":"Japanese","t":62,"u":61,"n":19},
        *    {"langs":"French","t":66,"u":60,"n":28},
        *    {"langs":"Korean","t":64,"u":58,"n":26}
        *],
        *"chartDP":{
        *    "dp":[
        *        {"data":[[-1,null],[0,124],[1,83],[2,72],[3,62],[4,66],[5,64],[6,null]],"label":"Total Sessions"},
        *        {"data":[[-1,null],[0,50],[1,30],[2,26],[3,19],[4,28],[5,26],[6,null]],"label":"New Users"}
        *    ],
        *   "ticks":[
        *        [-1,""], //used for padding for bars
        *        [23,""], //used for padding for bars
        *        [0,"English"],
        *        [1,"Italian"],
        *        [2,"German"],
        *        [3,"Japanese"],
        *        [4,"French"],
        *        [5,"Korean"]
        *    ]
        *}}
        */
        countlyMetric.getData = function(clean, join, metric1, estOverrideMetric) {
            var chartData = {};
            var i = 0;
            if (_processed) {
                chartData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (i = 0; i < _Db.length; i++) {
                    if (fetchValue && !clean) {
                        data[i][metric1 || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i][metric1 || _name] = countlyCommon.decode(data[i]._id);
                    }
                    chartData.chartData[i] = data[i];
                }
            }
            else {
                chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric1), this.clearObject, [
                    {
                        name: metric1 || _name,
                        func: function(rangeArr) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if (fetchValue && !clean) {
                                return fetchValue(rangeArr);
                            }
                            else {
                                return rangeArr;
                            }
                        }
                    },
                    { "name": "t" },
                    { "name": "u" },
                    { "name": "n" }
                ], estOverrideMetric || _estOverrideMetric);
            }
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric1 || _name);
            chartData.chartData.sort(function(a, b) {
                return b.t - a.t;
            });
            var namesData = _.pluck(chartData.chartData, metric1 || _name),
                totalData = _.pluck(chartData.chartData, 't'),
                newData = _.pluck(chartData.chartData, 'n');

            if (join) {
                chartData.chartDP = {ticks: []};
                var chartDP = [
                    {data: [], label: jQuery.i18n.map["common.table.total-sessions"]},
                    {data: [], label: jQuery.i18n.map["common.table.new-users"]}
                ];

                chartDP[0].data[0] = [-1, null];
                chartDP[0].data[namesData.length + 1] = [namesData.length, null];
                chartDP[1].data[0] = [-1, null];
                chartDP[1].data[namesData.length + 1] = [namesData.length, null];

                chartData.chartDP.ticks.push([-1, ""]);
                chartData.chartDP.ticks.push([namesData.length, ""]);

                for (i = 0; i < namesData.length; i++) {
                    chartDP[0].data[i + 1] = [i, totalData[i]];
                    chartDP[1].data[i + 1] = [i, newData[i]];
                    chartData.chartDP.ticks.push([i, namesData[i]]);
                }

                chartData.chartDP.dp = chartDP;
            }
            else {
                var chartData2 = [],
                    chartData3 = [];

                for (i = 0; i < namesData.length; i++) {
                    chartData2[i] = {
                        data: [
                            [0, totalData[i]]
                        ],
                        label: namesData[i]
                    };
                }

                for (i = 0; i < namesData.length; i++) {
                    chartData3[i] = {
                        data: [
                            [0, newData[i]]
                        ],
                        label: namesData[i]
                    };
                }

                chartData.chartDPTotal = {};
                chartData.chartDPTotal.dp = chartData2;

                chartData.chartDPNew = {};
                chartData.chartDPNew.dp = chartData3;
            }
            return chartData;
        };

        /**
        * Prefill all expected properties as u, t, n with 0, to avoid null values in the result, if they don't exist, which won't work when drawing graphs
        * @param {object} obj - oject to prefill with  values if they don't exist
        * @returns {object} prefilled object
        */
        countlyMetric.clearObject = function(obj) {
            if (obj) {
                if (!obj.t) {
                    obj.t = 0;
                }
                if (!obj.n) {
                    obj.n = 0;
                }
                if (!obj.u) {
                    obj.u = 0;
                }
            }
            else {
                obj = {"t": 0, "n": 0, "u": 0};
            }

            return obj;
        };

        /**
        * Get bar data for metric with percentages of total
        * @param {string} metric_pd - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
        */
        countlyMetric.getBarsWPercentageOfTotal = function(metric_pd) {
            if (_processed) {
                var rangeData = {};
                rangeData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (var i = 0; i < _Db.length; i++) {
                    if (fetchValue) {
                        data[i].range = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i].range = countlyCommon.decode(data[i]._id);
                    }
                    rangeData.chartData[i] = data[i];
                }
                return countlyCommon.calculateBarDataWPercentageOfTotal(rangeData);
            }
            else {
                return countlyCommon.extractBarDataWPercentageOfTotal(_Db, this.getMeta(metric_pd), this.clearObject, fetchValue);
            }
        };


        /**
        * Get bar data for metric
        * @param {string} metric_pd - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
        */
        countlyMetric.getBars = function(metric_pd) {
            if (_processed) {
                var rangeData = {};
                rangeData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (var i = 0; i < _Db.length; i++) {
                    if (fetchValue) {
                        data[i].range = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i].range = countlyCommon.decode(data[i]._id);
                    }
                    rangeData.chartData[i] = data[i];
                }
                return countlyCommon.calculateBarData(rangeData);
            }
            else {
                return countlyCommon.extractBarData(_Db, this.getMeta(metric_pd), this.clearObject, fetchValue);
            }
        };

        /**
        * If this metric's data should be segmented by OS (which means be prefixed by first os letter on server side), you can get OS segmented data
        * @param {string} os - os name for which to get segmented metrics data
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {string} metric_pd - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {object} os segmented metric object
        * @example <caption>Example output</caption>
        * //call
        * //countlyMetric.getOSSegmentedData("wp")
        * //data for Windows Phone segment
        *{"chartData":[
        *    {"density":"2.0","t":18,"u":18,"n":9},
        *    {"density":"3.4","t":13,"u":12,"n":5},
        *    {"density":"1.2","t":11,"u":10,"n":5},
        *    {"density":"3.5","t":10,"u":10,"n":4},
        *    {"density":"3.3","t":9,"u":9,"n":3}
        *],
        *"chartDP":{
        *    "dp":[
        *        {"data":[[0,53]],"label":"2.0"},
        *        {"data":[[0,49]],"label":"3.4"},
        *        {"data":[[0,46]],"label":"1.2"},
        *        {"data":[[0,36]],"label":"3.5"},
        *        {"data":[[0,32]],"label":"3.3"}
        *    ]
        *},
        * //list of all os segments
        *"os":[
        *   {"name":"Windows Phone","class":"windows phone"},
        *    {"name":"Android","class":"android"},
        *    {"name":"iOS","class":"ios"}
        *]}
        */
        countlyMetric.getOSSegmentedData = function(os, clean, metric_pd, estOverrideMetric) {
            var _os = countlyDeviceDetails.getPlatforms();
            var oSVersionData = {};
            var i = 0;
            if (_processed) {
                oSVersionData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (i = 0; i < _Db.length; i++) {
                    if (fetchValue && !clean) {
                        data[i][metric_pd || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i][metric_pd || _name] = countlyCommon.decode(data[i]._id);
                    }
                    oSVersionData.chartData[i] = data[i];
                }
            }
            else {
                oSVersionData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric_pd), this.clearObject, [
                    {
                        name: metric_pd || _name,
                        func: function(rangeArr) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if (fetchValue && !clean) {
                                return fetchValue(rangeArr);
                            }
                            else {
                                return rangeArr;
                            }
                        }
                    },
                    { "name": "t" },
                    { "name": "u" },
                    { "name": "n" }
                ], estOverrideMetric || _estOverrideMetric);
            }

            var osSegmentation = ((os) ? os : ((_os) ? _os[0] : null)),
                platformVersionTotal = _.pluck(oSVersionData.chartData, 'u'),
                chartData2 = [];
            var osName = osSegmentation;
            if (osSegmentation) {
                if (countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()]) {
                    osName = countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].short;
                }
                else {
                    osName = osSegmentation.toLowerCase()[0];
                }
            }

            if (oSVersionData.chartData) {
                var reg = new RegExp("^" + osName, "g");
                for (i = 0; i < oSVersionData.chartData.length; i++) {
                    var shouldDelete = true;
                    oSVersionData.chartData[i][metric_pd || _name] = oSVersionData.chartData[i][metric_pd || _name].replace(/:/g, ".");
                    if (reg.test(oSVersionData.chartData[i][metric_pd || _name])) {
                        shouldDelete = false;
                        oSVersionData.chartData[i][metric_pd || _name] = oSVersionData.chartData[i][metric_pd || _name].replace(reg, "");
                    }
                    else if (countlyMetric.checkOS && countlyMetric.checkOS(osSegmentation, oSVersionData.chartData[i][metric_pd || _name], osName)) {
                        shouldDelete = false;
                    }
                    if (shouldDelete) {
                        delete oSVersionData.chartData[i];
                        delete platformVersionTotal[i];
                    }
                }
            }

            oSVersionData.chartData = _.compact(oSVersionData.chartData);
            platformVersionTotal = _.compact(platformVersionTotal);

            var platformVersionNames = _.pluck(oSVersionData.chartData, metric_pd || _name);

            for (i = 0; i < platformVersionNames.length; i++) {
                chartData2[chartData2.length] = {
                    data: [
                        [0, platformVersionTotal[i]]
                    ],
                    label: platformVersionNames[i].replace(((countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()]) ? countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].name : osSegmentation) + " ", "")
                };
            }

            oSVersionData.chartDP = {};
            oSVersionData.chartDP.dp = chartData2;
            oSVersionData.os = [];

            if (_os && _os.length > 1) {
                for (i = 0; i < _os.length; i++) {
                    //if (_os[i] != osSegmentation) {
                    //    continue;
                    //}

                    oSVersionData.os.push({
                        "name": _os[i],
                        "class": _os[i].toLowerCase()
                    });
                }
            }

            return oSVersionData;
        };

        /** Get range data which is usually stored in some time ranges/buckets. As example is loyalty, session duration and session frequency
        * @param {string} metric_pd - name of the property in the model to fetch
        * @param {string} meta - name of the meta where property's ranges are stored
        * @param {string} explain - function that receives index of the bucket and returns bucket name
        * @param {array} order - list of keys ordered in preferred order(to return in same order)
        * @returns {object} data
        * @example <caption>Example output</caption>
        * //call
        * //countlyMetric.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange);
        * //returns
        * {"chartData":[
        *    {"f":"First session","t":271,"percent":"<div class='percent-bar' style='width:171px;'></div>85.5%"},
        *    {"f":"2 days","t":46,"percent":"<div class='percent-bar' style='width:29px;'></div>14.5%"}
        *  ],
        *  "chartDP":{
        *      "dp":[
        *        {"data":[[-1,null],[0,271],[1,46],[2,null]]}
        *      ],
        *      "ticks":[
        *        [-1,""],
        *        [2,""],
        *        [0,"First session"],
        *        [1,"2 days"]
        *      ]
        *   }
        *  }
        **/
        countlyMetric.getRangeData = function(metric_pd, meta, explain, order) {

            var chartData = {chartData: {}, chartDP: {dp: [], ticks: []}};

            chartData.chartData = countlyCommon.extractRangeData(_Db, metric_pd, this.getMeta(meta), explain, order);

            var frequencies = _.pluck(chartData.chartData, metric_pd),
                frequencyTotals = _.pluck(chartData.chartData, "t"),
                chartDP = [
                    {data: []}
                ];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[frequencies.length + 1] = [frequencies.length, null];

            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([frequencies.length, ""]);
            var i = 0;
            for (i = 0; i < frequencies.length; i++) {
                chartDP[0].data[i + 1] = [i, frequencyTotals[i]];
                chartData.chartDP.ticks.push([i, frequencies[i]]);
            }

            chartData.chartDP.dp = chartDP;

            for (i = 0; i < chartData.chartData.length; i++) {
                chartData.chartData[i].percent = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i].percent) + "px;'></div>" + chartData.chartData[i].percent + "%";
            }

            return chartData;
        };
        /** function set meta
        */
        function setMeta() {
            if (_Db.meta) {
                for (var i in _Db.meta) {
                    _metrics[i] = (_Db.meta[i]) ? _Db.meta[i] : [];
                }
            }
            else {
                _metrics = {};
            }
        }
        /** function extend meta
        */
        function extendMeta() {
            if (_Db.meta) {
                for (var i in _Db.meta) {
                    _metrics[i] = countlyCommon.union(_metrics[i], _Db.meta[i]);
                }
            }
        }

    };

    /**
    * Initialize countly text select. In most cases it is done automatically, only in some cases, when content loaded via ajax request outside of view lifecycle, you may need to initialize it yourself for your content specifically
    * @param {object} element - jQuery object reference
    * @example
    * CountlyHelpers.initializeTextSelect($("#my-dynamic-div"));
    */
    CountlyHelpers.initializeTextSelect = function(element) {
        element = element || $("#content-container");

        element.off("click", ".cly-text-select").on("click", ".cly-text-select", function(e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            initItems($(this));

            $("#date-picker").hide();
            e.stopPropagation();
        });

        element.off("click", ".cly-text-select .select-items .item").on("click", ".cly-text-select .select-items .item", function() {
            var selectedItem = $(this).parents(".cly-text-select").find(".text");
            selectedItem.text($(this).text());
            selectedItem.data("value", $(this).data("value"));
            selectedItem.val($(this).text());
        });

        element.off("keyup", ".cly-text-select input").on("keyup", ".cly-text-select input", function() {
            initItems($(this).parents(".cly-text-select"), true);

            $(this).data("value", $(this).val());

            if (!$(this).val()) {
                $(this).parents(".cly-text-select").find(".item").removeClass("hidden");
            }
            else {
                $(this).parents(".cly-text-select").find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $(this).parents(".cly-text-select").find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
            }
        });
        /** 
        * @param {object} select - html select element
        * @param {boolean} forceShow - if true shows element list
        * @returns {boolean} - returns false if there are no elements
        */
        function initItems(select, forceShow) {
            select.removeClass("req");

            var selectItems = select.find(".select-items");

            if (!selectItems.length) {
                return false;
            }

            if (select.find(".select-items").is(":visible") && !forceShow) {
                select.find(".select-items").hide();
            }
            else {
                select.find(".select-items").show();
                select.find(".select-items>div").addClass("scroll-list");
                select.find(".scroll-list").slimScroll({
                    height: '100%',
                    start: 'top',
                    wheelStep: 10,
                    position: 'right',
                    disableFadeOut: true
                });
            }
        }

        $(window).click(function() {
            $(".select-items").hide();
        });
    };

    /**
    * Generate random password
    * @param {number} length - length of the password
    * @param {boolean} no_special - do not include special characters
    * @returns {string} password
    * @example
    * //outputs 4UBHvRBG1v
    * CountlyHelpers.generatePassword(10, true);
    */
    CountlyHelpers.generatePassword = function(length, no_special) {
        var text = [];
        var chars = "abcdefghijklmnopqrstuvwxyz";
        var upchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var numbers = "0123456789";
        var specials = '!@#$%^&*()_+{}:"<>?|[];\',./`~';
        var all = chars + upchars + numbers;
        if (!no_special) {
            all += specials;
        }

        //1 char
        text.push(upchars.charAt(Math.floor(Math.random() * upchars.length)));
        //1 number
        text.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
        //1 special char
        if (!no_special) {
            text.push(specials.charAt(Math.floor(Math.random() * specials.length)));
            length--;
        }

        var j, x, i;
        //5 any chars
        for (i = 0; i < Math.max(length - 2, 5); i++) {
            text.push(all.charAt(Math.floor(Math.random() * all.length)));
        }

        //randomize order
        for (i = text.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = text[i - 1];
            text[i - 1] = text[j];
            text[j] = x;
        }

        return text.join("");
    };

    /**
    * Validate email address
    * @param {string} email - email address to validate
    * @returns {boolean} true if valid and false if invalid
    * @example
    * //outputs true
    * CountlyHelpers.validateEmail("test@test.test");
    *
    * //outputs false
    * CountlyHelpers.validateEmail("test@test");
    */
    CountlyHelpers.validateEmail = function(email) {
        var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        return re.test(email);
    };

    /**
    * Validate password based on settings provided via security configuration
    * @param {string} password - password to validate
    * @returns {boolean} true if valid and false if invalid
    */
    CountlyHelpers.validatePassword = function(password) {
        if (password.length < countlyGlobal.security.password_min) {
            return jQuery.i18n.prop("management-users.password.length", countlyGlobal.security.password_min);
        }
        if (countlyGlobal.security.password_char && !/[A-Z]/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-char"];
        }
        if (countlyGlobal.security.password_number && !/\d/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-number"];
        }
        if (countlyGlobal.security.password_symbol && !/[^A-Za-z\d]/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-special"];
        }
        return false;
    };

    $(document).ready(function() {
        $("#overlay").click(function() {
            var dialog = $(".dialog:visible:not(.cly-loading)");
            if (dialog.length) {
                dialog.fadeOut().remove();
                $(this).hide();
            }
        });

        $("#dialog-ok, #dialog-cancel, #dialog-continue").live('click', function() {
            $(this).parents(".dialog:visible").fadeOut().remove();
            if (!$('.dialog:visible').length) {
                $("#overlay").hide();
            }
        });

        $(document).keyup(function(e) {
            // ESC
            if (e.keyCode === 27) {
                $(".dialog:visible").animate({
                    top: 0,
                    opacity: 0
                }, {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    complete: function() {
                        $(this).remove();
                    }
                });

                $("#overlay").hide();
            }
        });
    });

}(window.CountlyHelpers = window.CountlyHelpers || {}));;/*global countlyCommon, countlyGlobal, _, jQuery*/
(function(countlyEvent, $, undefined) {

    //Private Properties
    var _activeEventDb = {},
        _activeEvents = {},
        _activeEvent = "",
        _activeSegmentation = "",
        _activeSegmentations = [],
        _activeSegmentationValues = [],
        _activeSegmentationObj = {},
        _activeAppKey = 0,
        _initialized = false,
        _period = null;
    var _activeLoadedEvent = "";
    var _activeLoadedSegmentation = "";

    countlyEvent.hasLoadedData = function() {
        if (_activeLoadedEvent && _activeLoadedEvent === _activeEvent && _activeLoadedSegmentation === _activeSegmentation) {
            return true;
        }
        return false;
    };

    //Public Methods
    countlyEvent.initialize = function(forceReload) {

        if (!forceReload && _initialized && _period === countlyCommon.getPeriodForAjax() && _activeAppKey === countlyCommon.ACTIVE_APP_KEY) {
            return countlyEvent.refresh();
        }
        if (forceReload && countlyEvent.hasLoadedData()) {
            return true;
        }
        var currentActiveEvent = _activeEvent;
        var currentActiveSegmentation = _activeSegmentation;
        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "get_events",
                        "period": _period,
                        "preventRequestAbort": true
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        _activeEvents = json;
                        if (!_activeEvent && countlyEvent.getEvents()[0]) {
                            _activeEvent = countlyEvent.getEvents()[0].key;
                            currentActiveEvent = _activeEvent;
                        }
                    }
                }))
                .then(
                    function() {
                        return $.when($.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.r,
                            data: {
                                "api_key": countlyGlobal.member.api_key,
                                "app_id": countlyCommon.ACTIVE_APP_ID,
                                "method": "events",
                                "event": _activeEvent,
                                "segmentation": currentActiveSegmentation,
                                "period": _period,
                                "preventRequestAbort": true
                            },
                            dataType: "jsonp",
                            success: function(json) {
                                if (currentActiveEvent === _activeEvent && currentActiveSegmentation === _activeSegmentation) {
                                    _activeLoadedEvent = _activeEvent;
                                    _activeLoadedSegmentation = _activeSegmentation;
                                    _activeEventDb = json;
                                    setMeta();
                                }
                            }
                        })).then(function() {
                            return true;
                        });
                    }
                );
        }
        else {
            _activeEventDb = {"2012": {}};
            return true;
        }
    };

    countlyEvent.getOverviewList = function() {
        if (_activeEvents && _activeEvents.overview) {
            return _activeEvents.overview;
        }
        else {
            return [];
        }
    };

    countlyEvent.getOverviewData = function(callback) {
        var my_events = [];
        var _overviewData = [];

        if (_activeEvents.overview) {
            for (var z = 0; z < _activeEvents.overview.length; z++) {
                if (my_events.indexOf(_activeEvents.overview[z].eventKey) === -1) {
                    my_events.push(_activeEvents.overview[z].eventKey);
                }
            }
        }

        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "api_key": countlyGlobal.member.api_key,
                "method": "events",
                "events": JSON.stringify(my_events),
                "period": countlyCommon.getPeriod(),
                "timestamp": new Date().getTime(),
                "overview": true
            },
            dataType: "json",
            success: function(json) {
                _overviewData = [];

                if (_activeEvents.overview) {
                    for (var i = 0; i < _activeEvents.overview.length; i++) {
                        var event_key = _activeEvents.overview[i].eventKey;
                        var am_visible = true;
                        if (_activeEvents.map && _activeEvents.map[event_key] && typeof _activeEvents.map[event_key].is_visible !== 'undefined') {
                            am_visible = _activeEvents.map[event_key].is_visible;
                        }
                        if (am_visible === true) {
                            var column = _activeEvents.overview[i].eventProperty;
                            if (event_key && column) {
                                var name = _activeEvents.overview[i].eventKey;
                                if (_activeEvents.map && _activeEvents.map[event_key] && _activeEvents.map[event_key].name) {
                                    name = _activeEvents.map[event_key].name;
                                }

                                var property = column;
                                if (_activeEvents.map && _activeEvents.map[event_key] && _activeEvents.map[event_key][column]) {
                                    property = _activeEvents.map[event_key][column];
                                }
                                var description = "";
                                if (_activeEvents.map && _activeEvents.map[event_key] && _activeEvents.map[event_key].description) {
                                    description = _activeEvents.map[event_key].description;
                                }

                                _overviewData.push({"ord": _overviewData.length, "name": name, "prop": property, "description": description, "key": event_key, "property": column, "data": json[event_key].data[column].sparkline, "count": json[event_key].data[column].total, "trend": json[event_key].data[column].change});
                            }
                        }
                    }
                }
                callback(_overviewData);
            }
        });

    };
    //updates event map for current app
    countlyEvent.update_map = function(event_map, event_order, event_overview, omitted_segments, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/events/edit_map",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "event_map": event_map,
                "event_order": event_order,
                "event_overview": event_overview,
                "omitted_segments": omitted_segments
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };
    //Updates visibility for multiple events
    countlyEvent.update_visibility = function(my_events, visibility, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/events/change_visibility",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "set_visibility": visibility,
                "events": JSON.stringify(my_events)
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };

    //Deletes events
    countlyEvent.delete_events = function(my_events, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/events/delete_events",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "events": JSON.stringify(my_events)
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };

    countlyEvent.refresh = function() {

        var currentActiveEvent = _activeEvent;
        var currentActiveSegmentation = _activeSegmentation;
        if (!countlyCommon.DEBUG) {
            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "get_events"
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        _activeEvents = json;
                        if (!_activeEvent && countlyEvent.getEvents()[0]) {
                            _activeEvent = countlyEvent.getEvents()[0].key;
                        }
                    }
                })
            ).then(
                function() {
                    return $.when(
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.r,
                            data: {
                                "api_key": countlyGlobal.member.api_key,
                                "app_id": countlyCommon.ACTIVE_APP_ID,
                                "method": "events",
                                "action": "refresh",
                                "event": _activeEvent,
                                "segmentation": currentActiveSegmentation
                            },
                            dataType: "jsonp",
                            success: function(json) {
                                if (currentActiveEvent === _activeEvent && currentActiveSegmentation === _activeSegmentation) {
                                    _activeLoadedEvent = _activeEvent;
                                    _activeLoadedSegmentation = _activeSegmentation;
                                    countlyCommon.extendDbObj(_activeEventDb, json);
                                    extendMeta();
                                }
                            }
                        })).then(
                        function() {
                            return true;
                        });
                });
        }
        else {
            _activeEventDb = {"2012": {}};
            return true;
        }
    };

    countlyEvent.reset = function() {
        _activeEventDb = {};
        _activeEvents = {};
        _activeEvent = "";
        _activeSegmentation = "";
        _activeSegmentations = [];
        _activeSegmentationValues = [];
        _activeSegmentationObj = {};
        _activeAppKey = 0;
        _activeLoadedEvent = "";
        _activeLoadedSegmentation = "";
        _initialized = false;
    };

    countlyEvent.refreshEvents = function() {
        if (!countlyCommon.DEBUG) {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_events"
                },
                dataType: "jsonp",
                success: function(json) {
                    _activeEvents = json;
                    if (!_activeEvent && countlyEvent.getEvents()[0]) {
                        _activeEvent = countlyEvent.getEvents()[0].key;
                    }
                }
            });
        }
        else {
            _activeEvents = {};
            return true;
        }
    };

    countlyEvent.setActiveEvent = function(activeEvent, callback) {
        var persistData = {};
        persistData["activeEvent_" + countlyCommon.ACTIVE_APP_ID] = activeEvent;
        countlyCommon.setPersistentSettings(persistData);

        _activeEventDb = {};
        _activeSegmentation = "";
        _activeSegmentations = [];
        _activeSegmentationValues = [];
        _activeSegmentationObj = {};
        _activeEvent = activeEvent && activeEvent.toString();
        _activeLoadedEvent = "";
        _activeLoadedSegmentation = "";

        $.when(countlyEvent.initialize(true)).then(callback);
    };

    countlyEvent.setActiveSegmentation = function(activeSegmentation, callback) {
        _activeEventDb = {};
        _activeSegmentation = activeSegmentation;
        _activeLoadedEvent = "";
        _activeLoadedSegmentation = "";

        $.when(countlyEvent.initialize(true)).then(callback);
    };

    countlyEvent.getActiveSegmentation = function() {
        return (_activeSegmentation) ? _activeSegmentation : jQuery.i18n.map["events.no-segmentation"];
    };

    countlyEvent.isSegmentedView = function() {
        return (_activeSegmentation) ? true : false;
    };

    countlyEvent.getEventData = function() {

        var eventData = {},
            mapKey = _activeEvent.replace("\\", "\\\\").replace("$", "\\u0024").replace(".", "\\u002e"),
            eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            countString = (eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count : jQuery.i18n.map["events.table.count"],
            sumString = (eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum : jQuery.i18n.map["events.table.sum"],
            durString = (eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur : jQuery.i18n.map["events.table.dur"];

        if (_activeSegmentation) {
            eventData = {chartData: {}, chartDP: {dp: [], ticks: []}};

            var tmpEventData = countlyCommon.extractTwoLevelData(_activeEventDb, _activeSegmentationValues, countlyEvent.clearEventsObject, [
                {
                    name: "curr_segment",
                    func: function(rangeArr) {
                        return rangeArr.replace(/:/g, ".").replace(/\[CLY\]/g, "").replace(/.\/\//g, "://");
                    }
                },
                { "name": "c" },
                { "name": "s" },
                { "name": "dur" }
            ]);

            eventData.chartData = tmpEventData.chartData;

            var segments = _.pluck(eventData.chartData, "curr_segment").slice(0, 15),
                segmentsCount = _.pluck(eventData.chartData, 'c'),
                segmentsSum = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN),
                segmentsDur = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN),
                chartDP = [
                    {data: [], color: countlyCommon.GRAPH_COLORS[0]}
                ];

            if (_.reduce(segmentsSum, function(memo, num) {
                return memo + num;
            }, 0) === 0) {
                segmentsSum = [];
            }

            if (_.reduce(segmentsDur, function(memo, num) {
                return memo + num;
            }, 0) === 0) {
                segmentsDur = [];
            }

            chartDP[chartDP.length] = {data: [], color: countlyCommon.GRAPH_COLORS[1]};
            chartDP[1].data[0] = [-1, null];
            chartDP[1].data[segments.length + 1] = [segments.length, null];

            chartDP[chartDP.length] = {data: [], color: countlyCommon.GRAPH_COLORS[2]};
            chartDP[2].data[0] = [-1, null];
            chartDP[2].data[segments.length + 1] = [segments.length, null];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[segments.length + 1] = [segments.length, null];

            eventData.chartDP.ticks.push([-1, ""]);
            eventData.chartDP.ticks.push([segments.length, ""]);

            for (var i = 0; i < segments.length; i++) {
                chartDP[0].data[i + 1] = [i, segmentsCount[i]];
                chartDP[1].data[i + 1] = [i, segmentsSum[i]];
                chartDP[2].data[i + 1] = [i, segmentsDur[i]];
                eventData.chartDP.ticks.push([i, segments[i]]);
            }

            eventData.chartDP.dp = chartDP;

            eventData.eventName = countlyEvent.getEventLongName(_activeEvent);
            if (mapKey && eventMap && eventMap[mapKey]) {
                eventData.eventDescription = eventMap[mapKey].description || "";
            }
            eventData.dataLevel = 2;
            eventData.tableColumns = [jQuery.i18n.map["events.table.segmentation"], countString];
            if (segmentsSum.length || segmentsDur.length) {
                if (segmentsSum.length) {
                    eventData.tableColumns[eventData.tableColumns.length] = sumString;
                }
                if (segmentsDur.length) {
                    eventData.tableColumns[eventData.tableColumns.length] = durString;
                }
            }
            else {
                _.each(eventData.chartData, function(element, index, list) {
                    list[index] = _.pick(element, "curr_segment", "c");
                });
            }
        }
        else {
            var chartData = [
                    { data: [], label: countString, color: countlyCommon.GRAPH_COLORS[0] },
                    { data: [], label: sumString, color: countlyCommon.GRAPH_COLORS[1] },
                    { data: [], label: durString, color: countlyCommon.GRAPH_COLORS[2] }
                ],
                dataProps = [
                    { name: "c" },
                    { name: "s" },
                    { name: "dur" }
                ];

            eventData = countlyCommon.extractChartData(_activeEventDb, countlyEvent.clearEventsObject, chartData, dataProps);

            eventData.eventName = countlyEvent.getEventLongName(_activeEvent);
            if (mapKey && eventMap && eventMap[mapKey]) {
                eventData.eventDescription = eventMap[mapKey].description || "";
            }
            eventData.dataLevel = 1;
            eventData.tableColumns = [jQuery.i18n.map["common.date"], countString];

            var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
            var cleanDurCol = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

            var reducedSum = _.reduce(cleanSumCol, function(memo, num) {
                return memo + num;
            }, 0);
            var reducedDur = _.reduce(cleanDurCol, function(memo, num) {
                return memo + num;
            }, 0);

            if (reducedSum !== 0 || reducedDur !== 0) {
                if (reducedSum !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = sumString;
                }
                if (reducedDur !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = durString;
                }
            }
            else {
                eventData.chartDP[1] = false;
                eventData.chartDP = _.compact(eventData.chartDP);
                _.each(eventData.chartData, function(element, index, list) {
                    list[index] = _.pick(element, "date", "c");
                });
            }
        }

        var countArr = _.pluck(eventData.chartData, "c");

        if (countArr.length) {
            eventData.totalCount = _.reduce(countArr, function(memo, num) {
                return memo + num;
            }, 0);
        }

        var sumArr = _.pluck(eventData.chartData, "s");

        if (sumArr.length) {
            eventData.totalSum = _.reduce(sumArr, function(memo, num) {
                return memo + num;
            }, 0);
        }

        var durArr = _.pluck(eventData.chartData, "dur");

        if (durArr.length) {
            eventData.totalDur = _.reduce(durArr, function(memo, num) {
                return memo + num;
            }, 0);
        }

        return eventData;
    };

    countlyEvent.getEvents = function(get_hidden) {
        var events = (_activeEvents) ? ((_activeEvents.list) ? _activeEvents.list : []) : [],
            eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            eventOrder = (_activeEvents) ? ((_activeEvents.order) ? _activeEvents.order : []) : [],
            eventSegments = (_activeEvents) ? ((_activeEvents.segments) ? _activeEvents.segments : {}) : {},
            eventsWithOrder = [],
            eventsWithoutOrder = [];
        for (var i = 0; i < events.length; i++) {
            var arrayToUse = eventsWithoutOrder;
            var mapKey = events[i].replace("\\", "\\\\").replace("$", "\\u0024").replace(".", "\\u002e");
            if (eventOrder.indexOf(events[i]) !== -1) {
                arrayToUse = eventsWithOrder;
            }

            if (!_activeEvents.omitted_segments) {
                _activeEvents.omitted_segments = {};
            }
            if (eventMap[mapKey]) {
                if (typeof eventMap[mapKey].is_visible === "undefined") {
                    eventMap[mapKey].is_visible = true;
                }
                if (eventMap[mapKey].is_visible || get_hidden) {
                    arrayToUse.push({
                        "key": events[i],
                        "name": eventMap[mapKey].name || events[i],
                        "description": eventMap[mapKey].description || "",
                        "count": eventMap[mapKey].count || "",
                        "sum": eventMap[mapKey].sum || "",
                        "dur": eventMap[mapKey].dur || "",
                        "is_visible": eventMap[mapKey].is_visible,
                        "is_active": (_activeEvent === events[i]),
                        "segments": eventSegments[mapKey] || [],
                        "omittedSegments": _activeEvents.omitted_segments[mapKey] || []
                    });
                }
            }
            else {
                arrayToUse.push({
                    "key": events[i],
                    "name": events[i],
                    "description": "",
                    "count": "",
                    "sum": "",
                    "dur": "",
                    "is_visible": true,
                    "is_active": (_activeEvent === events[i]),
                    "segments": eventSegments[mapKey] || [],
                    "omittedSegments": _activeEvents.omitted_segments[mapKey] || []
                });
            }
        }

        eventsWithOrder = _.sortBy(eventsWithOrder, function(event) {
            return eventOrder.indexOf(event.key);
        });
        eventsWithoutOrder = _.sortBy(eventsWithoutOrder, function(event) {
            return event.key;
        });

        return eventsWithOrder.concat(eventsWithoutOrder);
    };

    countlyEvent.getEventsWithSegmentations = function() {
        var eventSegmentations = (_activeEvents) ? ((_activeEvents.segments) ? _activeEvents.segments : []) : [],
            eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            eventNames = [];

        for (var event in eventSegmentations) {
            var mapKey = event.replace("\\", "\\\\").replace("$", "\\u0024").replace(".", "\\u002e");
            if (eventMap[mapKey] && eventMap[mapKey].name) {
                eventNames.push({
                    "key": event,
                    "name": eventMap[mapKey].name
                });
            }
            else {
                eventNames.push({
                    "key": event,
                    "name": event
                });
            }

            for (var i = 0; i < eventSegmentations[event].length; i++) {
                if (eventMap[mapKey] && eventMap[mapKey].name) {
                    eventNames.push({
                        "key": event,
                        "name": eventMap[mapKey].name + " / " + eventSegmentations[event][i]
                    });
                }
                else {
                    eventNames.push({
                        "key": event,
                        "name": event + " / " + eventSegmentations[event][i]
                    });
                }
            }
        }

        return eventNames;
    };

    countlyEvent.getEventMap = function(get_hidden) {
        var events = countlyEvent.getEvents(get_hidden),
            eventMap = {};

        for (var i = 0; i < events.length; i++) {
            eventMap[events[i].key] = events[i];
        }

        return eventMap;
    };

    countlyEvent.getEventLongName = function(eventKey) {
        var eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {};
        var mapKey = eventKey.replace("\\", "\\\\").replace("$", "\\u0024").replace(".", "\\u002e");
        if (eventMap[mapKey] && eventMap[mapKey].name) {
            return eventMap[mapKey].name;
        }
        else {
            return eventKey;
        }
    };

    countlyEvent.getEventSegmentations = function() {
        return _activeSegmentations;
    };

    countlyEvent.clearEventsObject = function(obj) {
        if (obj) {
            if (!obj.c) {
                obj.c = 0;
            }
            if (!obj.s) {
                obj.s = 0;
            }
            if (!obj.dur) {
                obj.dur = 0;
            }
        }
        else {
            obj = {"c": 0, "s": 0, "dur": 0};
        }

        return obj;
    };

    countlyEvent.getEventSummary = function() {
        //Update the current period object in case selected date is changed
        var _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
            currentSum = 0,
            previousSum = 0,
            currentDur = 0,
            previousDur = 0;
        var segment = "";
        var tmpCurrCount = 0,
            tmpCurrSum = 0,
            tmpCurrDur = 0,
            tmpPrevCount = 0,
            tmpPrevSum = 0,
            tmpPrevDur = 0;
        if (_periodObj.isSpecialPeriod) {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.currentPeriodArr[i]);
                tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriodArr[i]);
                tmp_x = countlyEvent.clearEventsObject(tmp_x);
                tmp_y = countlyEvent.clearEventsObject(tmp_y);

                if (_activeSegmentation) {

                    for (segment in tmp_x) {
                        tmpCurrCount += tmp_x[segment].c || 0;
                        tmpCurrSum += tmp_x[segment].s || 0;
                        tmpCurrDur += tmp_x[segment].dur || 0;

                        if (tmp_y[segment]) {
                            tmpPrevCount += tmp_y[segment].c || 0;
                            tmpPrevSum += tmp_y[segment].s || 0;
                            tmpPrevDur += tmp_y[segment].dur || 0;
                        }
                    }

                    tmp_x = {
                        "c": tmpCurrCount,
                        "s": tmpCurrSum,
                        "dur": tmpCurrDur
                    };

                    tmp_y = {
                        "c": tmpPrevCount,
                        "s": tmpPrevSum,
                        "dur": tmpPrevDur
                    };
                }

                currentTotal += tmp_x.c;
                previousTotal += tmp_y.c;
                currentSum += tmp_x.s;
                previousSum += tmp_y.s;
                currentDur += tmp_x.dur;
                previousDur += tmp_y.dur;
            }
        }
        else {
            tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriod);
            tmp_x = countlyEvent.clearEventsObject(tmp_x);
            tmp_y = countlyEvent.clearEventsObject(tmp_y);

            if (_activeSegmentation) {
                for (segment in tmp_x) {
                    tmpCurrCount += tmp_x[segment].c || 0;
                    tmpCurrSum += tmp_x[segment].s || 0;
                    tmpCurrDur += tmp_x[segment].dur || 0;

                    if (tmp_y[segment]) {
                        tmpPrevCount += tmp_y[segment].c || 0;
                        tmpPrevSum += tmp_y[segment].s || 0;
                        tmpPrevDur += tmp_y[segment].dur || 0;
                    }
                }

                tmp_x = {
                    "c": tmpCurrCount,
                    "s": tmpCurrSum,
                    "dur": tmpCurrDur
                };

                tmp_y = {
                    "c": tmpPrevCount,
                    "s": tmpPrevSum,
                    "dur": tmpPrevDur
                };
            }

            currentTotal = tmp_x.c;
            previousTotal = tmp_y.c;
            currentSum = tmp_x.s;
            previousSum = tmp_y.s;
            currentDur = tmp_x.dur;
            previousDur = tmp_y.dur;
        }

        var	changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeSum = countlyCommon.getPercentChange(previousSum, currentSum),
            changeDur = countlyCommon.getPercentChange(previousDur, currentDur);

        dataArr =
        {
            usage: {
                "event-total": {
                    "total": currentTotal,
                    "change": changeTotal.percent,
                    "trend": changeTotal.trend
                },
                "event-sum": {
                    "total": currentSum,
                    "change": changeSum.percent,
                    "trend": changeSum.trend
                },
                "event-dur": {
                    "total": countlyCommon.formatSecond(currentDur),
                    "change": changeDur.percent,
                    "trend": changeDur.trend
                }
            }
        };

        var eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            mapKey = _activeEvent.replace("\\", "\\\\").replace("$", "\\u0024").replace(".", "\\u002e"),
            countString = (eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count.toUpperCase() : jQuery.i18n.map["events.count"],
            sumString = (eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum.toUpperCase() : jQuery.i18n.map["events.sum"],
            durString = (eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur.toUpperCase() : jQuery.i18n.map["events.dur"];

        var bigNumbers = {
            "class": "one-column",
            "items": [
                {
                    "title": countString,
                    "class": "event-count",
                    "total": dataArr.usage["event-total"].total,
                    "trend": dataArr.usage["event-total"].trend
                }
            ]
        };

        if (currentSum !== 0 && currentDur === 0) {
            bigNumbers.class = "two-column";
            bigNumbers.items[bigNumbers.items.length] = {
                "title": sumString,
                "class": "event-sum",
                "total": dataArr.usage["event-sum"].total,
                "trend": dataArr.usage["event-sum"].trend
            };
        }
        else if (currentSum === 0 && currentDur !== 0) {
            bigNumbers.class = "two-column";
            bigNumbers.items[bigNumbers.items.length] = {
                "title": durString,
                "class": "event-dur",
                "total": dataArr.usage["event-dur"].total,
                "trend": dataArr.usage["event-dur"].trend
            };
        }
        else if (currentSum !== 0 && currentDur !== 0) {
            bigNumbers.class = "threes-column";
            bigNumbers.items[bigNumbers.items.length] = {
                "title": sumString,
                "class": "event-sum",
                "total": dataArr.usage["event-sum"].total,
                "trend": dataArr.usage["event-sum"].trend
            };
            bigNumbers.items[bigNumbers.items.length] = {
                "title": durString,
                "class": "event-dur",
                "total": dataArr.usage["event-dur"].total,
                "trend": dataArr.usage["event-dur"].trend
            };
        }

        return bigNumbers;
    };

    countlyEvent.getMultiEventData = function(eventKeysArr, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "api_key": countlyGlobal.member.api_key,
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "events",
                "events": JSON.stringify(eventKeysArr)
            },
            dataType: "jsonp",
            success: function(json) {
                callback(extractDataForGraphAndChart(json));
            }
        });

        /** function extracts data for graph and chart
        * @param {object} dataFromDb - extracted data from db
        * @returns {object} graph and chart data
        */
        function extractDataForGraphAndChart(dataFromDb) {
            var eventData = {},
                eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
                mapKey = _activeEvent.replace("\\", "\\\\").replace("$", "\\u0024").replace(".", "\\u002e"),
                countString = (eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count : jQuery.i18n.map["events.table.count"],
                sumString = (eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum : jQuery.i18n.map["events.table.sum"],
                durString = (eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur : jQuery.i18n.map["events.table.dur"];

            var chartData = [
                    { data: [], label: countString, color: countlyCommon.GRAPH_COLORS[0] },
                    { data: [], label: sumString, color: countlyCommon.GRAPH_COLORS[1] },
                    { data: [], label: durString, color: countlyCommon.GRAPH_COLORS[2] }
                ],
                dataProps = [
                    { name: "c" },
                    { name: "s" },
                    { name: "dur" }
                ];

            eventData = countlyCommon.extractChartData(dataFromDb, countlyEvent.clearEventsObject, chartData, dataProps);

            eventData.eventName = countlyEvent.getEventLongName(_activeEvent);
            eventData.dataLevel = 1;
            eventData.tableColumns = [jQuery.i18n.map["common.date"], countString];

            var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
            var cleanDurCol = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

            var reducedSum = _.reduce(cleanSumCol, function(memo, num) {
                return memo + num;
            }, 0);
            var reducedDur = _.reduce(cleanDurCol, function(memo, num) {
                return memo + num;
            }, 0);

            if (reducedSum !== 0 || reducedDur !== 0) {
                if (reducedSum !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = sumString;
                }
                if (reducedDur !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = durString;
                }
            }
            else {
                eventData.chartDP[1] = false;
                eventData.chartDP = _.compact(eventData.chartDP);
                _.each(eventData.chartData, function(element, index, list) {
                    list[index] = _.pick(element, "date", "c");
                });
            }

            var countArr = _.pluck(eventData.chartData, "c");

            if (countArr.length) {
                eventData.totalCount = _.reduce(countArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var sumArr = _.pluck(eventData.chartData, "s");

            if (sumArr.length) {
                eventData.totalSum = _.reduce(sumArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var durArr = _.pluck(eventData.chartData, "dur");

            if (durArr.length) {
                eventData.totalDur = _.reduce(durArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            return eventData;
        }
    };
    /** function set meta */
    function setMeta() {
        _activeSegmentationObj = _activeEventDb.meta || {};
        _activeSegmentations = _activeSegmentationObj.segments || [];
        if (_activeSegmentations) {
            _activeSegmentations.sort();
        }
        _activeSegmentationValues = (_activeSegmentationObj[_activeSegmentation]) ? _activeSegmentationObj[_activeSegmentation] : [];
    }
    /** function extend meta */
    function extendMeta() {
        for (var metaObj in _activeEventDb.meta) {
            if (_activeSegmentationObj[metaObj] && _activeEventDb.meta[metaObj] && _activeSegmentationObj[metaObj].length !== _activeEventDb.meta[metaObj].length) {
                _activeSegmentationObj[metaObj] = countlyCommon.union(_activeSegmentationObj[metaObj], _activeEventDb.meta[metaObj]);
            }
        }

        _activeSegmentations = _activeSegmentationObj.segments;
        if (_activeSegmentations) {
            _activeSegmentations.sort();
        }
        _activeSegmentationValues = (_activeSegmentationObj[_activeSegmentation]) ? _activeSegmentationObj[_activeSegmentation] : [];
    }

}(window.countlyEvent = window.countlyEvent || {}, jQuery));;/* global CountlyHelpers, countlySession, countlyLocation, countlyCommon, _, jQuery*/
(function() {

    window.countlySession = window.countlySession || {};
    CountlyHelpers.createMetricModel(window.countlySession, {name: "users", estOverrideMetric: "users"}, jQuery);

    countlySession.callback = function(isRefresh, data) {
        if (isRefresh) {
            countlyLocation.refresh(data);
        }
        else {
            countlyLocation.initialize();
        }
    };

    countlySession.getSessionData = function() {
        var map = {t: "total-sessions", n: "new-users", u: "total-users", d: "total-duration", e: "events", p: "paying-users", m: "messaging-users"};
        var ret = {};
        var data = countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e", "p", "m"], ["u", "p", "m"], {u: "users"}, countlySession.clearObject);

        for (var i in data) {
            ret[map[i]] = data[i];
        }

        //calculate returning users
        var changeReturning = countlyCommon.getPercentChange(
            Math.max(ret["total-users"]["prev-total"] - ret["new-users"]["prev-total"], 0),
            Math.max(ret["total-users"].total - ret["new-users"].total, 0));
        ret["returning-users"] = {
            "total": Math.max(ret["total-users"].total - ret["new-users"].total, 0),
            "prev-total": Math.max(ret["total-users"]["prev-total"] - ret["new-users"]["prev-total"], 0),
            "change": changeReturning.percent,
            "trend": changeReturning.trend
        };

        //convert duration to minutes
        ret["total-duration"].total /= 60;
        ret["total-duration"]["prev-total"] /= 60;

        //calculate average duration
        var changeAvgDuration = countlyCommon.getPercentChange(
            (ret["total-sessions"]["prev-total"] === 0) ? 0 : ret["total-duration"]["prev-total"] / ret["total-sessions"]["prev-total"],
            (ret["total-sessions"].total === 0) ? 0 : ret["total-duration"].total / ret["total-sessions"].total);
        ret["avg-duration-per-session"] = {
            "prev-total": (ret["total-sessions"]["prev-total"] === 0) ? 0 : ret["total-duration"]["prev-total"] / ret["total-sessions"]["prev-total"],
            "total": (ret["total-sessions"].total === 0) ? 0 : ret["total-duration"].total / ret["total-sessions"].total,
            "change": changeAvgDuration.percent,
            "trend": changeAvgDuration.trend
        };

        ret["total-duration"].total = countlyCommon.timeString(ret["total-duration"].total);
        ret["total-duration"]["prev-total"] = countlyCommon.timeString(ret["total-duration"]["prev-total"]);
        ret["avg-duration-per-session"].total = countlyCommon.timeString(ret["avg-duration-per-session"].total);
        ret["avg-duration-per-session"]["prev-total"] = countlyCommon.timeString(ret["avg-duration-per-session"]["prev-total"]);

        //calculate average events
        var changeAvgEvents = countlyCommon.getPercentChange(
            (ret["total-users"]["prev-total"] === 0) ? 0 : ret.events["prev-total"] / ret["total-users"]["prev-total"],
            (ret["total-users"].total === 0) ? 0 : ret.events.total / ret["total-users"].total);
        ret["avg-events"] = {
            "prev-total": (ret["total-users"]["prev-total"] === 0) ? 0 : ret.events["prev-total"] / ret["total-users"]["prev-total"],
            "total": (ret["total-users"].total === 0) ? 0 : ret.events.total / ret["total-users"].total,
            "change": changeAvgEvents.percent,
            "trend": changeAvgEvents.trend
        };

        ret["avg-events"].total = ret["avg-events"].total.toFixed(1);
        ret["avg-events"]["prev-total"] = ret["avg-events"]["prev-total"].toFixed(1);

        //get sparkleLine data
        var sparkLines = countlyCommon.getSparklineData(countlySession.getDb(), {
            "total-sessions": "t",
            "new-users": "n",
            "total-users": "u",
            "total-duration": "d",
            "events": "e",
            "returning-users": function(tmp_x) {
                return Math.max(tmp_x.u - tmp_x.n, 0);
            },
            "avg-duration-per-session": function(tmp_x) {
                return (parseInt(tmp_x.t) === 0) ? 0 : (tmp_x.d / tmp_x.t);
            },
            "avg-events": function(tmp_x) {
                return (parseInt(tmp_x.u) === 0) ? 0 : (tmp_x.e / tmp_x.u);
            }
        }, countlySession.clearObject);

        for (var z in sparkLines) {
            ret[z].sparkline = sparkLines[z];
        }

        return {usage: ret};
    };

    countlySession.getSessionDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-sessions"] },
                { data: [], label: jQuery.i18n.map["common.table.new-sessions"] },
                { data: [], label: jQuery.i18n.map["common.table.unique-sessions"] }
            ],
            dataProps = [
                { name: "t" },
                { name: "n" },
                { name: "u" }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getSessionDPTotal = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-sessions"], color: '#DDDDDD', mode: "ghost" },
                { data: [], label: jQuery.i18n.map["common.table.total-sessions"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pt",
                    func: function(dataObj) {
                        return dataObj.t;
                    },
                    period: "previous"
                },
                { name: "t" }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getUserDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"] },
                { data: [], label: jQuery.i18n.map["common.table.new-users"] },
                { data: [], label: jQuery.i18n.map["common.table.returning-users"] }
            ],
            dataProps = [
                { name: "u" },
                { name: "n" },
                {
                    name: "returning",
                    func: function(dataObj) {
                        return dataObj.u - dataObj.n;
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getUserDPActive = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"], color: '#DDDDDD', mode: "ghost" },
                { data: [], label: jQuery.i18n.map["common.table.total-users"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pt",
                    func: function(dataObj) {
                        return dataObj.u;
                    },
                    period: "previous"
                },
                {
                    name: "t",
                    func: function(dataObj) {
                        return dataObj.u;
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getUserDPNew = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.new-users"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.table.new-users"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pn",
                    func: function(dataObj) {
                        return dataObj.n;
                    },
                    period: "previous"
                },
                { name: "n" }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getMsgUserDPActive = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"], color: countlyCommon.GRAPH_COLORS[0]},
                { data: [], label: jQuery.i18n.map["common.table.messaging-users"], color: countlyCommon.GRAPH_COLORS[1] }
            ],
            dataProps = [
                {
                    name: "u"
                },
                {
                    name: "m"
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getDurationDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.time-spent"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.time-spent"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "previous_t",
                    func: function(dataObj) {
                        return ((dataObj.d / 60).toFixed(1));
                    },
                    period: "previous"
                },
                {
                    name: "t",
                    func: function(dataObj) {
                        return ((dataObj.d / 60).toFixed(1));
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getDurationDPAvg = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.average-time"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.average-time"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "previous_average",
                    func: function(dataObj) {
                        return ((parseInt(dataObj.t) === 0) ? 0 : ((dataObj.d / dataObj.t) / 60).toFixed(1));
                    },
                    period: "previous"
                },
                {
                    name: "average",
                    func: function(dataObj) {
                        return ((parseInt(dataObj.t) === 0) ? 0 : ((dataObj.d / dataObj.t) / 60).toFixed(1));
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getEventsDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.reqs-received"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.reqs-received"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pe",
                    func: function(dataObj) {
                        return dataObj.e;
                    },
                    period: "previous"
                },
                {
                    name: "e"
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getEventsDPAvg = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.avg-reqs-received"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.avg-reqs-received"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "previous_average",
                    func: function(dataObj) {
                        return ((parseInt(dataObj.u) === 0) ? 0 : ((dataObj.e / dataObj.u).toFixed(1)));
                    },
                    period: "previous"
                },
                {
                    name: "average",
                    func: function(dataObj) {
                        return ((parseInt(dataObj.u) === 0) ? 0 : ((dataObj.e / dataObj.u).toFixed(1)));
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };
    /** gets duration range
    * @returns {array} duration ranges
    */
    function durationRange() {
        var sec = jQuery.i18n.map["common.seconds"],
            min = jQuery.i18n.map["common.minutes"],
            hr = jQuery.i18n.map["common.hour"];

        return [
            "0 - 10 " + sec,
            "11 - 30 " + sec,
            "31 - 60 " + sec,
            "1 - 3 " + min,
            "3 - 10 " + min,
            "10 - 30 " + min,
            "30 - 60 " + min,
            "> 1 " + hr
        ];
    }
    countlySession.getDurationRange = function() {
        return durationRange();
    };
    countlySession.explainDurationRange = function(index) {
        return durationRange()[index];
    };

    countlySession.getDurationIndex = function(duration) {
        return durationRange().indexOf(duration);
    };

    /** gets frequency ranges
    * @returns {array} frequency ranges
    */
    function frequencyRange() {
        var localHours = jQuery.i18n.map["user-loyalty.range.hours"],
            localDay = jQuery.i18n.map["user-loyalty.range.day"],
            localDays = jQuery.i18n.map["user-loyalty.range.days"];

        return [
            jQuery.i18n.map["user-loyalty.range.first-session"],
            "1-24 " + localHours,
            "1 " + localDay,
            "2 " + localDays,
            "3 " + localDays,
            "4 " + localDays,
            "5 " + localDays,
            "6 " + localDays,
            "7 " + localDays,
            "8-14 " + localDays,
            "15-30 " + localDays,
            "30+ " + localDays
        ];
    }

    countlySession.getFrequencyRange = function() {
        return frequencyRange();
    };
    countlySession.explainFrequencyRange = function(index) {
        return frequencyRange()[index];
    };

    countlySession.getFrequencyIndex = function(frequency) {
        return frequencyRange().indexOf(frequency);
    };

    /** gets loyalty ranges
    * @returns {array} loyalty ranges
    */
    function loyaltyRange() {
        return [
            "1",
            "2",
            "3-5",
            "6-9",
            "10-19",
            "20-49",
            "50-99",
            "100-499",
            "> 500"
        ];
    }
    countlySession.getLoyalityRange = function() {
        return loyaltyRange();
    };
    countlySession.explainLoyaltyRange = function(index) {
        return loyaltyRange()[index];
    };

    countlySession.getLoyaltyIndex = function(loyalty) {
        return loyaltyRange().indexOf(loyalty);
    };

    countlySession.getTopUserBars = function() {

        var barData = [],
            maxItems = 3,
            totalSum = 0;

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"] }
            ],
            dataProps = [
                {
                    name: "t",
                    func: function(dataObj) {
                        return dataObj.u;
                    }
                }
            ];

        var totalUserData = countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps),
            topUsers = _.sortBy(_.reject(totalUserData.chartData, function(obj) {
                return parseInt(obj.t) === 0;
            }), function(obj) {
                return -obj.t;
            });

        totalUserData.chartData.forEach(function(t) {
            totalSum += t.t;
        });

        if (topUsers.length < 3) {
            maxItems = topUsers.length;
        }

        for (var i = 0; i < maxItems; i++) {
            var percent = Math.floor((topUsers[i].t / totalSum) * 100);
            barData[i] = { "name": topUsers[i].date, "count": topUsers[i].t, "type": "user", "percent": percent };
        }

        return barData;
    };

    countlySession.clearObject = function(obj) {
        if (obj) {
            if (!obj.t) {
                obj.t = 0;
            }
            if (!obj.n) {
                obj.n = 0;
            }
            if (!obj.u) {
                obj.u = 0;
            }
            if (!obj.d) {
                obj.d = 0;
            }
            if (!obj.e) {
                obj.e = 0;
            }
            if (!obj.p) {
                obj.p = 0;
            }
            if (!obj.m) {
                obj.m = 0;
            }
        }
        else {
            obj = {"t": 0, "n": 0, "u": 0, "d": 0, "e": 0, "p": 0, "m": 0};
        }

        return obj;
    };

}());;/*global countlyCommon, countlyCity, jQuery, CountlyHelpers, google, _, countlyGlobal*/
(function() {

    // Private Properties
    var _chart,
        _dataTable,
        _chartElementId = "geo-chart",
        _chartOptions = {
            displayMode: 'markers',
            colorAxis: {minValue: 0, colors: ['#D7F1D8', '#6BB96E']},
            resolution: 'countries',
            toolTip: {textStyle: {color: '#FF0000'}, showColorCode: false},
            legend: "none",
            backgroundColor: "transparent",
            datalessRegionColor: "#FFF",
            region: "TR"
        };

    if (countlyCommon.CITY_DATA === false) {
        countlyCity.initialize = function() {
            return true;
        };
        countlyCity.refresh = function() {
            return true;
        };
        countlyCity.drawGeoChart = function() {
            return true;
        };
        countlyCity.refreshGeoChart = function() {
            return true;
        };
        countlyCity.getLocationData = function() {
            return [];
        };
    }
    else {
        window.countlyCity = window.countlyCity || {};
        CountlyHelpers.createMetricModel(window.countlyCity, {name: "cities", estOverrideMetric: "cities"}, jQuery, function(rangeArr) {
            if (rangeArr === "Unknown") {
                return jQuery.i18n.map["common.unknown"];
            }
            return rangeArr;
        });

        countlyCity.drawGeoChart = function(options) {

            if (options) {
                if (options.chartElementId) {
                    _chartElementId = options.chartElementId;
                }

                if (options.height) {
                    _chartOptions.height = options.height;

                    //preserve the aspect ratio of the chart if height is given
                    _chartOptions.width = (options.height * 556 / 347);
                }
            }

            if (google.visualization) {
                draw(options.metric);
            }
            else {
                google.load('visualization', '1', {'packages': ['geochart'], callback: draw});
            }
        };

        countlyCity.refreshGeoChart = function(metric) {
            if (google.visualization) {
                reDraw(metric);
            }
            else {
                google.load('visualization', '1', {'packages': ['geochart'], callback: draw});
            }
        };

        countlyCity.getLocationData = function(options) {

            var locationData = countlyCity.getData();

            if (options && options.maxCountries && locationData.chartData) {
                if (locationData.chartData.length > options.maxCountries) {
                    locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
                }
            }

            return locationData.chartData;
        };
    }

    /** private method to draw chart
    * @param {object} ob - data for data selection
    */
    function draw(ob) {
        ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
        var chartData = {cols: [], rows: []};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(countlyCity.getDb(), countlyCity.getMeta(), countlyCity.clearObject, [
            {
                "name": "city",
                "func": function(rangeArr) {
                    if (rangeArr === "Unknown") {
                        return jQuery.i18n.map["common.unknown"];
                    }
                    return rangeArr;
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "cities");

        chartData.cols = [
            {id: 'city', label: "City", type: 'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function(value) {
            if (value.city === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value[ob.metric]}
                    ]
                };
            }
            return {
                c: [
                    {v: value.city},
                    {v: value[ob.metric]}
                ]
            };
        });

        _dataTable = new google.visualization.DataTable(chartData);

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
            _chartOptions.region = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country;
        }

        _chartOptions.resolution = 'countries';
        _chartOptions.displayMode = "markers";

        if (ob.metric === "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        }
        else if (ob.metric === "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        }
        else if (ob.metric === "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        _chart.draw(_dataTable, _chartOptions);
    }

    /** private method to redraw chart
    * @param {object} ob - data for data selection
    */
    function reDraw(ob) {
        ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
        var chartData = {cols: [], rows: []};

        var tt = countlyCommon.extractTwoLevelData(countlyCity.getDb(), countlyCity.getMeta(), countlyCity.clearObject, [
            {
                "name": "city",
                "func": function(rangeArr) {
                    if (rangeArr === "Unknown") {
                        return jQuery.i18n.map["common.unknown"];
                    }
                    return rangeArr;
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "cities");

        chartData.cols = [
            {id: 'city', label: "City", type: 'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function(value) {
            if (value.city === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value[ob.metric]}
                    ]
                };
            }
            return {
                c: [
                    {v: value.city},
                    {v: value[ob.metric]}
                ]
            };
        });

        if (ob.metric === "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        }
        else if (ob.metric === "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        }
        else if (ob.metric === "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        _dataTable = new google.visualization.DataTable(chartData);
        _chart.draw(_dataTable, _chartOptions);
    }

}());;/* global countlyCommon, countlyLocation, CountlyHelpers, countlySession, google, _, countlyGlobal, Backbone, jQuery, $*/
(function() {

    // Private Properties
    var _chart,
        _dataTable,
        _chartElementId = "geo-chart",
        _chartOptions = {
            displayMode: 'region',
            colorAxis: {minValue: 0, colors: ['#D7F1D8', '#6BB96E']},
            resolution: 'countries',
            toolTip: {textStyle: {color: '#FF0000'}, showColorCode: false},
            legend: "none",
            backgroundColor: "transparent",
            datalessRegionColor: "#FFF"
        },
        _countryMap = {};

    // Load local country names
    $.get('localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function(data) {
        _countryMap = data;
    });

    window.countlyLocation = window.countlyLocation || {};
    countlyLocation.getCountryName = function(cc) {
        var countryName = _countryMap[cc.toUpperCase()];
        if (countryName) {
            return countryName;
        }
        else if (cc.toUpperCase() === "EU") {
            return jQuery.i18n.map["common.eu"] || "European Union";
        }
        else {
            return jQuery.i18n.map["common.unknown"] || "Unknown";
        }
    };
    CountlyHelpers.createMetricModel(window.countlyLocation, {name: "countries", estOverrideMetric: "countries"}, jQuery, countlyLocation.getCountryName);

    // Public Methods
    countlyLocation.initialize = function() {
        countlyLocation.setDb(countlySession.getDb());
    };

    countlyLocation.refresh = function(newJSON) {
        if (newJSON) {
            countlyLocation.extendDb(newJSON);
        }
    };

    countlyLocation.drawGeoChart = function(options) {
        if (options) {
            if (options.chartElementId) {
                _chartElementId = options.chartElementId;
            }

            if (options.height) {
                _chartOptions.height = options.height;

                //preserve the aspect ratio of the chart if height is given
                _chartOptions.width = (options.height * 556 / 347);
            }
        }

        if (google.visualization) {
            draw(options.metric);
        }
        else {
            google.load('visualization', '1', {
                'packages': ['geochart'],
                callback: function() {
                    draw(options.metric);
                }
            });
        }
    };

    countlyLocation.refreshGeoChart = function(metric) {
        if (google.visualization) {
            reDraw(metric);
        }
        else {
            google.load('visualization', '1', {
                'packages': ['geochart'],
                callback: function() {
                    draw(metric);
                }
            });
        }
    };

    countlyLocation.getLocationData = function(options) {

        var locationData = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name": "country",
                "func": function(rangeArr) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            {
                "name": "code",
                "func": function(rangeArr) {
                    return rangeArr.toLowerCase();
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "countries");
        locationData.chartData = countlyCommon.mergeMetricsByName(locationData.chartData, "country");
        locationData.chartData = _.sortBy(locationData.chartData, function(obj) {
            return -obj.t;
        });

        if (options && options.maxCountries && locationData.chartData) {
            if (locationData.chartData.length > options.maxCountries) {
                locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
            }
        }

        for (var i = 0; i < locationData.chartData.length; i++) {
            locationData.chartData[i].country_flag =
                "<div class='flag' style='margin-top:2px; background-image:url(" + countlyGlobal.path + "/images/flags/" + locationData.chartData[i].code + ".png);'></div>" +
                locationData.chartData[i].country;
        }

        return locationData.chartData;
    };

    countlyLocation.changeLanguage = function() {
        // Load local country names
        return $.get('localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function(data) {
            _countryMap = data;
        });
    };

    //Private Methods
    /** funstion draw
    * @param {object} ob - data
    */
    function draw(ob) {
        ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
        var chartData = {cols: [], rows: []};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name": "country",
                "func": function(rangeArr) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "countries");

        chartData.cols = [
            {id: 'country', label: jQuery.i18n.map["countries.table.country"], type: 'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function(value) {
            if (value.country === "European Union" || value.country === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value[ob.metric]}
                    ]
                };
            }
            return {
                c: [
                    {v: value.country},
                    {v: value[ob.metric]}
                ]
            };
        });

        _dataTable = new google.visualization.DataTable(chartData);

        _chartOptions.region = "world";
        _chartOptions.resolution = 'countries';
        _chartOptions.displayMode = "region";

        if (ob.metric === "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        }
        else if (ob.metric === "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        }
        else if (ob.metric === "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        // This is how you handle regionClick and change zoom for only a specific country
        if (countlyCommon.CITY_DATA !== false && Backbone.history.fragment === "/analytics/countries") {
            google.visualization.events.addListener(_chart, 'regionClick', function(eventData) {
                var activeAppCountry = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country;
                if (activeAppCountry && eventData.region === activeAppCountry) {
                    _chartOptions.region = eventData.region;
                    _chartOptions.resolution = 'countries';
                    _chart.draw(_dataTable, _chartOptions);

                    $(document).trigger('selectMapCountry');
                }
            });
        }

        _chart.draw(_dataTable, _chartOptions);
    }
    /** function redraw
    * @param {object} ob - data
    */
    function reDraw(ob) {
        ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
        var chartData = {cols: [], rows: []};

        var tt = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name": "country",
                "func": function(rangeArr) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "countries");

        chartData.cols = [
            {id: 'country', label: jQuery.i18n.map["countries.table.country"], type: 'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function(value) {
            if (value.country === "European Union" || value.country === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value[ob.metric]}
                    ]
                };
            }
            return {
                c: [
                    {v: value.country},
                    {v: value[ob.metric]}
                ]
            };
        });

        if (ob.metric === "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        }
        else if (ob.metric === "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        }
        else if (ob.metric === "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        _dataTable = new google.visualization.DataTable(chartData);
        _chart.draw(_dataTable, _chartOptions);
    }

}());;/**
 * Object with device models as keys and pretty/marketing device names as values
 * @name countlyDeviceList
 * @global
 * @namespace countlyDeviceList
 */
window.countlyDeviceList = {"562": "TCL 562", "716": "TechPad_716", "916": "TechPad", "5058": "i5C plus", "5062": "S5E FULL VIEW", "5501": "i6A", "5701": "ADVAN G2 plus", "6001": "G3", "7008": "X7 Pro", "8082": "ALCATEL 1T 10", "8741": "PIVOT 8741/8753", "8742": "PIVOT 8741/8753", "8753": "PIVOT 8741/8753", "2013022": "Hong Mi", "2013023": "Redmi", "2014011": "HM 1STD", "2014501": "HM 1SLTETD", "2014502": "HM 2A", "2014811": "HM 2LTE-CU", "2014812": "HM 2LTE-CT", "2014813": "HM 2LTE-CMCC", "2014817": "HM 2LTE-SA", "2014818": "HM 2LTE-IN", "2014819": "HM 2LTE-BR", "iPhone1,1": "iPhone 1G", "iPhone1,2": "iPhone 3G", "iPhone2,1": "iPhone 3GS", "iPhone3,1": "iPhone 4 (GSM)", "iPhone3,2": "iPhone 4 (GSM Rev A)", "iPhone3,3": "iPhone 4 (CDMA)", "iPhone4,1": "iPhone 4s", "iPhone5,1": "iPhone 5 (GSM)", "iPhone5,2": "iPhone 5 (Global)", "iPhone5,3": "iPhone 5c (GSM)", "iPhone5,4": "iPhone 5c (Global)", "iPhone6,1": "iPhone 5s (GSM)", "iPhone6,2": "iPhone 5s (Global)", "iPhone7,1": "iPhone 6 Plus", "iPhone7,2": "iPhone 6", "iPhone8,1": "iPhone 6s", "iPhone8,2": "iPhone 6s Plus", "iPhone8,4": "iPhone SE", "iPhone9,1": "iPhone 7 (A1660/A1779/A1780)", "iPhone9,3": "iPhone 7 (A1778)", "iPhone9,2": "iPhone 7 Plus (A1661/A1785/A1786)", "iPhone9,4": "iPhone 7 Plus (A1784)", "iPhone10,1": "iPhone 8 (A1863/A1906/A1907)", "iPhone10,4": "iPhone 8 (A1905)", "iPhone10,2": "iPhone 8 Plus (A1864/A1898/A1899)", "iPhone10,5": "iPhone 8 Plus (A1897)", "iPhone10,3": "iPhone X (A1865/A1902)", "iPhone10,6": "iPhone X (A1901)", "iPod1,1": "iPod touch 1G", "iPod2,1": "iPod touch 2G", "iPod3,1": "iPod touch 3G", "iPod4,1": "iPod touch 4G", "iPod5,1": "iPod touch 5G", "iPod7,1": "iPod touch 6G", "iPad1,1": "iPad", "iPad2,1": "iPad 2 (WiFi)", "iPad2,2": "iPad 2 (GSM)", "iPad2,3": "iPad 2 (CDMA)", "iPad2,4": "iPad 2 (WiFi Rev A)", "iPad3,1": "iPad 3 (WiFi)", "iPad3,2": "iPad 3 (CDMA)", "iPad3,3": "iPad 3 (Global)", "iPad3,4": "iPad 4 (WiFi)", "iPad3,5": "iPad 4 (GSM)", "iPad3,6": "iPad 4 (Global)", "iPad4,1": "iPad Air (WiFi)", "iPad4,2": "iPad Air (Wi-Fi+LTE)", "iPad4,3": "iPad Air (Rev)", "iPad5,3": "iPad Air 2 (WiFi)", "iPad5,4": "iPad Air 2 (Global)", "iPad6,7": "iPad Pro 12.9in (WiFi)", "iPad6,8": "iPad Pro 12.9in", "iPad6,3": "iPad Pro 9.7in (WiFi)", "iPad6,4": "iPad Pro 9.7in", "iPad6,11": "iPad 5 (WiFi)", "iPad6,12": "iPad 5", "iPad7,1": "iPad Pro 12.9in (WiFi)", "iPad7,2": "iPad Pro 12.9in", "iPad7,3": "iPad Pro 10.5in (WiFi)", "iPad7,4": "iPad Pro 10.5in", "iPad7,5": "iPad 6 (WiFi)", "iPad7,6": "iPad 6", "iPad2,5": "iPad mini (WiFi)", "iPad2,6": "iPad mini (GSM)", "iPad2,7": "iPad mini (Global)", "iPad4,4": "iPad mini 2 (WiFi)", "iPad4,5": "iPad mini 2 (Wi-Fi+LTE)", "iPad4,6": "iPad mini 2 (Rev)", "iPad4,7": "iPad mini 3 (WiFi)", "iPad4,8": "iPad mini 3 (A1600)", "iPad4,9": "iPad mini 3 (A1601)", "iPad5,1": "iPad mini 4 (Wi-Fi)", "iPad5,2": "iPad mini 4 (Wi-Fi+LTE)", "Watch1,1": "Apple Watch (1st Gen) 38mm", "Watch1,2": "Apple Watch (1st Gen) 42mm", "Watch2,6": "Apple Watch Series 1 38mm", "Watch2,7": "Apple Watch Series 1 42mm", "Watch2,3": "Apple Watch Series 2 38mm", "Watch2,4": "Apple Watch Series 2 42mm", "Watch3,1": "Apple Watch Series 3 38mm", "Watch3,2": "Apple Watch Series 3 42mm", "Watch3,3": "Apple Watch Series 3 38mm (A1858)", "Watch3,4": "Apple Watch Series 3 42mm (A1859)", "AppleTV2,1": "Apple TV 2G", "AppleTV3,1": "Apple TV 3G", "AppleTV3,2": "Apple TV 3G (Rev)", "AppleTV5,3": "Apple TV 4G", "AppleTV6,2": "Apple TV 4K", "i386": "Simulator (i386)", "x86_64": "Simulator (x84_64)", "KFSUWI": "Fire HD 10 (2017)", "KFAUWI": "Fire (2017)", "KFDOWI": "Fire HD 8 (2017)", "KFGIWI": "Fire HD 8 (2016)", "KFFOWI": "Fire (2015)", "KFMEWI": "Fire HD 8 (2015)", "KFTBWI": "Fire HD 10 (2015)", "KFARWI": "Fire HD 6 (2014)", "KFASWI": "Fire HD 7 (2014)", "KFSAWA": "Fire HDX 8.9 (2014)", "KFSAWI": "Fire HDX 8.9 (2014) WiFi", "KFAPWA": "Kindle Fire HDX 8.9 (2013)", "KFAPWI": "Kindle Fire HDX 8.9 (2013) WiFi", "KFTHWA": "Kindle Fire HDX (2013)", "KFTHWI": "Kindle Fire HDX (2013) WiFi", "KFSOWI": "Kindle Fire HD (2013)", "KFJWA": "Kindle Fire HD 8.9 (2012) WiFi", "KFTT": "Kindle Fire HD 7 (2012)", "KFOT": "Kindle Fire (2012)", "Kindle Fire": "Kindle Fire (2011)", "AFTT": "Fire TV Stick (Gen 2)", "AFTRS": "Fire TV Edition (Element 4K)", "AFTKMST12": "Fire TV Edition (Toshiba 4K)", "AFTM": "Fire TV Stick (Gen 1)", "AFTB": "Fire TV (Gen 1)", "AFTS": "Fire TV (Gen 2)", "AFTN": "Fire TV (Gen 3)", "AFTA": "Fire TV Cube", "Light B100": "4GOOD Light B100", "Light A103": "A103", "TR10CS1": "TR10CS1_P", "VFD 720": "Vodafone Smart N9", "E4010": "AG BOOST 2", "Flair": "AG Flair", "AG_Go_Tab_Access_2": "AG Go Tab Access 2", "Ultra 2": "AG Ultra2", "AG Go-Tab Access": "AG_Go-Tab_Access", "Hashtag": "HASHTAG", "STYLE_PLUS": "STYLE PLUS", "Style 2": "Style_2", "Ultra": "ULTRA", "MD1001": "MD1001 Tablet", "A1_Neo": "A1 Neo", "H450R": "Trailblazer", "A731-N1": "A731", "A731": "AOC", "A731-H1": "AOC", "A732G": "AOC", "A831L-D": "AOC", "AOpen Chromebase Mini": "RK3288 10\" Chromebase", "AOpen Chromebox Mini": "RK3288 Mini Chromebox", "AXXA_S45": "AXXA S45", "WE E2": "E2", "A08S": "A08SM", "PEARL A4 PLUS": "Pearl A4 PLUS", "Pearl A4": "Pearl_A4", "SPEED_S8": "SPEED S8", "AK330S": "AK330s", "Acer Chromebook R13 (CB5-312T)": "Acer Chromebook R13", "C01": "C01 (PA)", "AA3-600": "Aspire A3", "b1-720": "B1-720", "b1-721": "B1-721", "Chromebook 14 for work (CP5-471)": "Chromebook 14 for work", "Acer Chromebook 15 (CB3-532)": "Chromebook 15 (CB3-532)", "Acer Chromebook 15 (CB5-571)": "Chromebook 15 (CB5-571)", "sand": "Chromebook 15 CB515-1HT/1H", "Acer Chromebook R11": "Chromebook R11 (C738T)", "Acer Chromebook R11 (CB5-132T / C738T)": "Chromebook R11 (C738T)", "scarlet": "Chromebook Tab 10", "S500": "CloudMobile S500", "B1-730HD": "Iconia One 7", "B3-A50": "Iconia One 10", "B3-A50FHD": "Iconia One 10", "B3-A32": "Iconia One 10", "B3-A20": "Iconia One 10", "B3-A20B": "Iconia One 10", "G1-725": "Iconia One 7", "B1-7A0": "Iconia One 7", "B1-790": "Iconia One 7", "B1-750": "Iconia One 7", "B1-730": "Iconia One 7", "B1-860A": "Iconia One 8", "B1-870": "Iconia One 8", "A1-850": "Iconia One 8", "B1-810": "Iconia One 8", "A3-A50": "Iconia Tab 10", "B3-A40": "Iconia Tab 10", "B3-A40FHD": "Iconia Tab 10", "A3-A20": "Iconia Tab 10", "A3-A20FHD": "Iconia Tab 10", "B3-A42": "Iconia Tab 10 (AsgardLTE)", "A1-713": "Iconia Tab 7", "A1-713HD": "Iconia Tab 7", "A1-840FHD": "Iconia Tab 8", "A1-840": "Iconia Tab 8", "A1-841": "Iconia Tab 8", "A100": "V9", "A101": "Iconia Tab A100 (VanGogh)", "A200": "Iconia Tab A200", "A210": "CANVAS 4", "A211": "Iconia Tab A211", "A500": "Picasso", "A501": "Picasso", "A510": "Iconia Tab A510", "A511": "Iconia Tab A511", "A700": "Iconia Tab A700", "A701": "Iconia Tab A701", "A1-724": "Iconia TalkTab 7", "Acer Liquid": "Liquid", "Acer S100": "Liquid", "Z200": "Liquid Z200", "I110": "Liquid C1", "V360": "Liquid E1", "V370": "Liquid E2", "E380": "Liquid E3", "Z130": "Liquid Z3", "E600": "Liquid E600", "E39": "Liquid E700", "AK330": "Liquid Gallant E350", "E350": "Liquid Gallant E350", "S55": "Polaroid Snap S55", "S58A": "Liquid Jade 2", "S56": "Liquid Jade S", "S57": "Liquid Jade Z", "E310": "Liquid Mini", "S510": "Liquid S1", "S520": "Liquid S2", "S53": "Liquid X1", "T02": "Liquid Z530", "S59": "Liquid X2", "Z205": "Liquid Z205", "Z205P": "Liquid Z205", "Z220": "Liquid Z220", "T012": "Liquid Z320", "T01": "Liquid Z330", "Z160": "Liquid Z4", "Z410": "Liquid Z410", "Z150": "Liquid Z5", "Z500": "Liquid Z500", "Z520": "Liquid Z520", "T05": "Liquid Z530S", "T09": "Liquid Z6", "T11": "Liquid Z6 Plus", "T03": "Liquid Z630", "T04": "Liquid Z630S", "T10": "DynaVox T10", "T06": "Liquid Zest", "T07": "Liquid Zest 4G", "T08": "Liquid Zest Plus", "Acer Liquid Metal": "LiquidMT", "Liquid MT": "LiquidMT", "Liquid Metal": "LiquidMT", "G100W": "Picasso", "TPA60W": "Picasso", "TA272HUL": "TA2", "TD070VA1": "Tab 7", "ALIGATOR S4080": "ALIGATOR S4080 Duo", "S4082 Duo": "ALIGATOR S4082 Duo", "S5062 Duo": "ALIGATOR S5062 Duo", "Aligator S5510": "ALIGATOR S5510 Duo", "ALIGATOR S5060": "S5060 Duo", "G3SMNTA22": "A2272PW4T", "G3SMNTA24": "A2472PW4T", "G2SMNT": "S221C3A", "i5G": "ADVAN S50 4G", "E1C_3G": "E1C", "S7D": "E1C NXT", "i5K": "G1 PRO", "i55C": "G2", "i7_Plus": "I Tab", "i5E": "I5E", "ADVAN M4": "M4", "ADVAN S40": "S40", "i4U": "S40 LTE", "AFFIX T737": "T737", "LC-TS08A": "EDSTAR LC-TS08A", "LC-TS08S": "EDSTAR LC-TS08S", "X300": "RX300", "S7": "Solely Tab S7", "S8": "Tech4U S8", "Access_Q784C": "Alcor", "Zest_Q108I": "Alcor", "Zest_Q708I": "Alcor", "ALIGATOR S5065": "S5065", "A5_Easy": "A5 Easy", "A5_Easy_TM": "A5 Easy", "A5_Lite": "A5 Lite", "A5_Quad_Plus": "A5 Quad Plus", "A5_Quad_Plus_TM": "A5 Quad Plus", "A5_Ready": "A5 Ready", "A5_Ready_TM": "A5 Ready", "A6_Duo": "A6 Duo", "A6_Lite": "A6 Lite", "A7_Lite": "A7 Lite", "A8_Lite": "A8 Lite", "A8_Lite_TM": "A8 Lite TM", "A9_Plus": "A9  Plus", "A9_Lite": "A9 Lite", "AX4Nano_plus": "AX4 Nano Plus", "C6_Duo": "C6 Duo", "C6Quad_4G": "C6 Quad 4G", "E2_Jump": "E2 Jump", "E3_Jump": "E3 Jump", "E3_Living": "E3 Living", "E3_Sign": "E3 Sign", "E4_Lite": "E4 Lite", "P4_Pro": "P4 Pro", "P4_Quad": "P4 Quad", "P4_eMagic": "P4 eMagic", "P4_eMagic_TM": "P4 eMagic", "P41_eMagic": "P41 eMagic", "P41_eMagic_TM": "P41 eMagic", "P43_Easy": "P43 Easy", "P5_Energy": "P5 Energy", "P5Life_TM": "P5 Life", "P5_Lite": "P5 Lite", "P5_Pro": "P5 Pro", "P5_eMagic": "P5 eMagic", "P5_eMagic_TM": "P5 eMagic", "P5_Pro_TM": "P5_Pro", "P6_plus": "P6  Plus", "P6_Energy_TM": "P6 Energy", "P6_Energy_Lite": "P6 Energy Lite", "P6_Energy_Lite_TM": "P6 Energy Lite", "P6_Energy_mini": "P6 Energy mini", "P6_Life": "P6 Life", "P6_lite": "P6 Lite", "P6_lite_TM": "P6 Lite", "P6_lite_mTEL": "P6 Lite", "P6_Pro": "P6 Pro", "P6_Qmax": "P6 Qmax", "P6_eMagic": "P6 eMagic", "P7_Lite": "P7 Lite", "P7_Lite_TM": "P7 Lite", "P7_PRO": "P7 PRO", "P7_PRO_TM": "P7 PRO_TM", "P8_Energy": "P8 Energy", "P8_Energy_PRO": "P8 Energy Pro", "P8_Energy_mini": "P8 Energy mini", "P8_Energy_mini_TM": "P8 Energy mini", "P8_Life": "P8 Life", "P8_PRO": "P8 Pro", "P8_eMagic": "P8 eMagic", "P8_eMagic_TM": "P8 eMagic", "P9_Energy": "P9 Energy", "P9_Energy_Lite": "P9 Energy Lite", "P9_Energy_Lite_2017": "P9 Energy Lite 2017", "P9_Energy_mini_TM": "P9 Energy Mini", "P9_Energy_S": "P9 Energy S", "P9_Energy_mini": "P9 Energy mini", "P9_Life": "P9 Life", "V1_Viper_E": "V1 Viper E", "V1_Viper_I4G": "V1 Viper I4G", "V1_Viper_I4G_PL": "V1 Viper I4G", "V1_Viper_I4G_TM": "V1 Viper I4G", "V1_Viper_L": "V1 Viper L", "V1_Viper_S4G": "V1 Viper S4G", "V2_Viper": "V2 Viper", "V2_Viper_E": "V2 Viper E", "V2_Viper_I": "V2 Viper I", "V2_Viper_I_TM": "V2 Viper I", "V2_Viper_I4G": "V2 Viper I4G", "V2_Viper_S": "V2 Viper S", "V2_Viper_X": "V2 Viper X", "V2_Viper_X_plus": "V2 Viper X plus", "V2_Viper_Xe": "V2 Viper Xe", "V3_Viper": "V3 Viper", "Viva_1001G": "Viva 1001G", "Viva_C701": "Viva C701", "Viva_C702": "Viva C702", "VivaH10LTE": "Viva H10 LTE", "Viva_H1001_LTE": "Viva H1001 LTE", "Viva_H1002_LTE": "Viva H1002 LTE", "VivaH7LTE": "Viva H7 LTE", "VivaH8LTE": "Viva H8 LTE", "H8_Life": "Viva H8 Life", "Viva_H801": "Viva H801", "Viva_H801_LTE": "Viva H801 LTE", "Viva_H802_LTE": "Viva H802 LTE", "Viva_H802_LTE_TM": "Viva H802 LTE", "Viva_i10HD": "Viva i10HD", "Viva_H701_LTE_CZ": "Viva i701G", "Viva_i701G": "Viva i701G", "Viva_i701G_TM": "Viva i701G", "Viva_i7G": "Viva i7G", "X2_Soul_Lite": "X2 Soul Lite", "X2_Soul_Lite_TM": "X2 Soul Lite", "X2_Soul_Mini": "X2 Soul Mini", "X2_Soul_PRO": "X2 Soul PRO", "X2_Soul_Style": "X2 Soul Style", "X2_Soul_Style_TM": "X2 Soul Style", "X2_Soul_Style_Plus": "X2 Soul Style+", "X2_Soul_Xtreme": "X2 Soul Xtreme", "X3_Soul_Lite": "X3 Soul Lite", "X3_Soul_Lite_TM": "X3 Soul Lite", "X3_Soul_PLUS": "X3 Soul Plus", "X3_Soul_PRO": "X3 Soul Pro", "X3_Soul_Style": "X3 Soul Style", "X3_Soul_mini": "X3 Soul mini", "X3_Soul": "X3Soul", "X4_Soul": "X4 Soul", "X4_Soul_Infinity_L": "X4 Soul Infinity L", "X4_Soul_Infinity_N": "X4 Soul Infinity N", "X4_Soul_Infinity_Plus": "X4 Soul Infinity Plus", "X4_Soul_Infinity_S": "X4 Soul Infinity SV", "X4_Soul_Infinity_Z": "X4 Soul Infinity Z", "X4_Soul_Lite": "X4 Soul Lite", "X4_Soul_Mini": "X4 Soul Mini", "X4_Soul_Mini_S": "X4 Soul Mini S", "X4_Soul_Mini_S_TM": "X4 Soul Mini S", "X4_Soul_Style": "X4 Soul Style", "X4_Soul_Vision": "X4 Soul Vision", "X4_Soul_Xtreme": "X4 Soul Xtreme", "X5_Soul_Pro": "X5 Soul Pro", "S60": "Polaroid Snap S60", "S70": "ALTICE S70", "S11": "AlTICE S11", "STARNAUTE4": "STARNAUTE 4", "Altice_S31": "S31", "STARNAUTE 3": "STARNAUTE3", "STARTRAIL7": "STARTRAIL 7", "STARACTIVE": "Staractive", "AM518": "Amgoo", "bq Aquaris": "Aquaris I8", "MID7317CP": "Auchan MID7317CP Tablet", "MID7055": "COBY MID7055", "CT710": "Carrefour CT710", "EM63": "EM63 Tablet", "MID1065": "Coby MID1065", "MID7065": "Coby MID7065", "MID8065": "Coby MID8065", "D2-727": "D2-727G", "GS-718": "DOPO GMS-718 Tablet / Discovery", "DP3D8": "DOTPAD DP3D8 / Gadmei", "TAB-840_G": "Digix TAB-840_G", "MT8000": "Eviant MT8000", "nuvi 3590": "Garmin nuvi3590", "nuvi 3595": "Nuvi 3595", "GR-TB10S": "Grundig GR-TB10S Tablet", "U2": "HCL ME TABLET PC U2", "P771A": "HKC P771A", "P774A": "HKC P774A", "P776A": "HKC P776A", "P778A": "HKC P778A", "P886A": "HKC P886A", "NS-13T001": "Insignia NS-13T001 Tablet", "JT1241": "Jiateng JT1241", "MD7305": "Lazer MD7305 Tablet / AMTC", "I10A-LE": "Leader I10A-LE", "G2": "Mach_Speed Trio G2 Tablet", "Marquis_MP977": "Marquis Tablet", "M97": "Matsunichi M97", "M7": "Monster M7 Tablet", "NX007HD": "Nextbook NX007HD Tablet", "NX008HD8G": "Nextbook NX008HD8G Tablet", "NX008HI": "Nextbook NX008HI Tablet / Carrefour CT810", "Next7D12": "Nextbook Next7D12 Tablet", "Next7P12": "Nextbook Next7P12", "PNDPP48GP": "Pendo PNDPP48GP", "W626": "Philips W626", "PLT7223G": "Proscan PLT7223G", "PLT7777": "Proscan PLT7777", "PLT8223G": "Proscan PLT8223G", "RCT6078W2": "RCA RCT6078W2", "TECTOYTT2500": "TecToy TT-2500", "PRO7D": "Visual Land Prestige 7D", "Camelio Family tablet": "Vivitar Camelio Tablet", "XO Learning tablet": "Vivitar XO Tablet", "TBDG773": "Zeki TBDG773", "EGP008": "ematic EGP008", "EGP010": "ematic EGP010", "EGS004": "ematic EGS004", "EGS102": "ematic EGS102", "Smart\\'TAB 8003": "essentielb ST8003/FT8001 Tablet", "CMP748": "iCraig CMP748", "CMP749": "iCraig CMP749", "Aprix_Phat6": "Phat6", "Aprix Tab64": "Tab64", "Aprix_X4": "X4", "arcelik_uhd_powermax_at": "B55L 9682 5AS", "ARCHOS 101 CHILDPAD": "101 Childpad", "Archos 101 Cobalt": "101 Cobalt", "Archos 101 Copper": "101 Copper", "ARCHOS 101G9": "101 G9", "Archos 101 Helium": "101 Helium", "Archos 101 Helium Lite": "101 Helium Lite", "ARCHOS 101 Magnus": "101 Magnus", "Archos 101 Neon": "101 Neon", "Archos 101 Oxygen": "101 Oxygen", "ARCHOS 101 PLATINUM": "101 Platinum", "ARCHOS 101 Titanium": "101 Titanium", "ARCHOS 101G10": "101 XS", "Archos 101 Xenon": "101 Xenon", "Archos 101c Xenon": "101 Xenon", "Archos 101 Xenon v2": "101 Xenon", "Archos 101 Xenon Lite": "101 Xenon Lite", "Archos 101d Neon": "101D Neon", "ARCHOS 101 XS 2": "101XS2", "Archos 101XS3": "101XS3", "Archos 101b Copper": "101b Copper", "Archos 101b Helium": "101b Helium", "Archos 101b Neon": "101b Neon", "Archos 101b Oxygen": "101b Oxygen", "Archos 101b Platinium": "101b Platinum", "ARCHOS 101b XS2": "101b XS2", "Archos 101b Xenon v2": "101b Xenon", "Archos 101c Copper": "101c Copper", "Archos 101c Neon": "101c Neon", "Archos 101c Platinum": "101c Platinum", "Archos 101d Platinum v2": "101d Platinum v2", "Archos 101d Platinum v3": "101d Platinum v3", "Archos 101e Neon": "101e neon", "Archos 121 Neon": "121 Neon", "Archos 133 Oxygen": "133 Oxygen", "Archos 35b Titanium": "35b Titanium", "Archos 40 Helium": "40 Helium", "Archos 40 Neon": "40 Neon", "Archos 40 Power": "40 Power", "Archos 40 Titanium": "40 Titanium", "Archos 40b Titanium Surround": "40b Titanium", "Archos 40c Titanium": "40c Titanium", "ARCHOS 40C TIv2": "40c Titanium", "ARCHOS 40d Titanium": "40d Titanium", "Archos 45 Helium 4G": "45 Helium 4G", "Archos 45 Neon": "45 Neon", "Archos 45 Platinum": "45 Platinum", "Archos 45 Titanium": "45 Titanium", "AC45BHE": "45b Helium", "ARCHOS 45b Helium": "45b Helium", "Archos 45b Neon": "45b Neon", "Archos 45b Platinum": "45b Platinum", "Archos 45c Helium": "45c Helium", "Archos 45c Platinum": "45c Platinum", "Archos 45c Titanium": "45c Titanium", "Archos 45d Platinum": "45d Platinum", "Archos 50 Cobalt": "50 Cobalt", "Archos 50 Diamond": "50 Diamond", "Archos 50 Helium 4G": "50 Helium 4G", "Archos 50 Helium Plus": "50 Helium Plus", "Archos 50 Neon": "50 Neon", "Archos 50 Oxygen": "50 Oxygen", "Archos 50 Oxygen Plus": "50 Oxygen plus", "Archos 50 Platinum": "50 Platinum", "Archos 50 Platinum 4G": "50 Platinum 4G", "Archos 50 Power": "50 Power", "Archos 50 Saphir": "50 Saphir", "Archos 50 Titanium": "50 Titanium", "A50TI": "50 Titanium 4G", "AC50DHE": "50 d Helium", "Archos 50B Cobalt": "50B Cobalt", "Archos 50f Neon": "50F Neon", "AC50BHE": "50b Helium", "Archos 50b Helium 4G": "50b Helium", "Archos 50b Neon": "50b Neon", "Archos 50b Oxygen": "50b Oxygen", "Archos 50b Platinum": "50b Platinum", "Archos 50c Helium": "50c Helium", "ARCHOS 50c Neon": "50c Neon", "Archos 50c Neon": "50c Neon", "Archos 50c Oxygen": "50c Oxygen", "Archos 50c Platinum": "50c Platinum", "Archos 50d Neon": "50d Neon", "Archos 50d Oxygen": "50d Oxygen", "Archos 50e Helium": "50e Helium", "Archos 50e Neon": "50e Neon", "Archos 50f Helium": "50f Helium", "Archos 50F Neon": "50f Neon", "Archos 52 Platinum": "52 Platinum", "Archos 53 Platinum": "53 Platinum", "Archos 53 Titanium": "53 Titanium", "Archos 55 Cobalt Plus": "55 Cobalt Plus", "Archos 55 Cobalt plus": "55 Cobalt Plus", "Archos 55 diamond Selfie": "55 Diamond Selfie", "Archos 55 Helium": "55 Helium", "Archos 55 Helium Plus": "55 Helium Plus", "Archos 55 Platinum": "55 platinum", "Archos 55B Cobalt": "55B Cobalt", "Archos 55B Platinum": "55b Platinum", "Archos 59 Titanium": "59 Titanium", "Archos 59 Xenon": "59 Xenon", "Archos 60 Platinum": "60 Platinum", "Archos 62 Xenon": "62 Xenon", "Archos 64 Xenon": "64 Xenon", "ARCHOS 70 Cobalt": "70 Cobalt", "Archos 70 Copper": "70 Copper", "Archos 70 Helium": "70 Helium", "Archos 70 Neon": "70 Neon", "Archos 70 Neon Plus": "70 Neon Plus", "Archos 70 Oxygen": "70 Oxygen", "Archos 70 Platinum": "Archos 70 platinum", "Archos 70 Platinum 3G": "70 Platinum 3G", "Archos 70 Platinum v2": "70 Platinum v2", "ARCHOS 70 Titanium": "70 Titanium", "Archos 70 Xenon": "70 Xenon", "Archos 70 Xenon Color": "70 Xenon Color", "Archos 70 Platinum v3": "70 platinum", "Archos 70b Cobalt": "70b Cobalt", "Archos 70b Copper": "70b Copper", "Archos 70b Helium": "70b Helium", "Archos 70b Neon": "70b Neon", "ARCHOS 70b TITANIUM": "70b Titanium", "Archos 70b Xenon": "70b Xenon", "Archos 70c Cobalt": "70c Cobalt", "Archos 70c Neon": "70c Neon", "Archos 70c Titanium": "70c Titanium", "Archos 70c Xenon": "70c Xenon", "ARCHOS 70it2": "70it 2", "ARCHOS 70it2G8": "70it 2", "Archos 79 Cobalt": "79 Cobalt", "Archos 79 Neon": "79 Neon", "ARCHOS 79 Platinum": "79 Platinium", "Archos 79 Xenon": "79 Xenon", "ARCHOS 80 Carbon": "80 Carbon", "ARCHOS 80 CHILDPAD": "80 Childpad", "ARCHOS 80 COBALT": "80 Cobalt", "ARCHOS 80G9": "80 G9", "Archos 80 Helium 4G": "80 Helium", "Archos 80 Oxygen": "80 Oxygen", "ARCHOS 80 Platinum": "80 Platinum", "Archos 80 Platinum": "80 Platinum", "Archos 80 Platinum v2": "80 Platinum v2", "ARCHOS 80 TITANIUM": "80 Titanium", "ARCHOS 80XSK": "80 XS", "Archos 80 Xenon": "80 Xenon", "Archos 80b Helium": "80b Helium", "Archos 80b Helium v2": "80b Helium", "ARCHOS 80b PLATINUM": "80b Platinum", "Archos 80b Xenon": "80b xenon", "Archos 80c Xenon": "80c Xenon", "Archos 80d Xenon": "80d Xenon", "Archos 90 Copper": "90 Copper", "Archos 90 Neon": "90 Neon", "Archos 90b Copper": "90b Copper", "Archos 90b Neon": "90b Neon", "Archos 96 Xenon": "96 Xenon", "ARCHOS 97 CARBON": "97 Carbon", "Archos 97 Cobalt": "97 Cobalt", "ARCHOS 97 Platinum": "97 Platinum", "ARCHOS 97 TITANIUMHD": "97 Titanium HD", "ARCHOS 97 XENON": "97 Xenon", "ARCHOS 97b PLATINUM": "97b Platinum", "ARCHOS 97B TITANIUM": "97b Titanium", "Archos 97c Platinum": "97c Platinum", "ALBA 4": "Alba 4", "ALBA 10 TABLET": "alba 10", "Alba 4.0\" Smartphone": "Alba 4", "ALBA 5": "Alba 5", "ALBA 7 TABLET": "Alba 7", "Alba 7": "Alba 7\\'\\'", "Alba 7\"": "Alba 7\\'\\'", "Alba 8\"": "Alba 8\\'\\'", "Archos 101 DB": "ArcBook", "Archos 101 Platinium 3G": "Archos 101 Platinum 3G", "Archos 101b Xenon v3": "Archos 101b Xenon", "ALBA 8 TABLET": "Archos 50c Platinum", "Archos Access 101 3G V2": "Archos Acces 101 3G", "Archos Phone": "Archos Sense 55 DC", "Archos Sense 101 X": "Archos Sense 101X", "Archos 80c Platinum": "Archos80cpl_loreal", "Qilive 45": "Auchan QiLive 45", "Qilive 50": "Auchan QiLive 50", "Qilive 40": "Auchan Qilive 40", "QiLive 8": "Auchan Qilive8", "QiLive 8QC": "Auchan Qilive8QC", "QiLive 97": "Auchan Qilive97", "QiLive 97R": "Auchan Qilive97R", "Selecline 10": "Auchan Selecline 10", "Bush 10\" Android": "Bush 10\\'\\'", "Bush 4 Android": "Bush 4\" Android Phone", "Bush 5\" 4G": "Bush 5 4G", "Bush Spira C2 5\" Smartphone": "Bush 5 4G", "Bush 5.5\" 4G": "Bush 5 4G", "Bush Spira D2 5.5\" Smartphone": "Bush 5 4G", "BUSH 5 Android": "Bush 5\" Android Phone", "Archos 79c Neon": "Bush 7.85 My Tablet", "Bush 8\" LTE Android": "Bush 8\"", "Bush 8 Android": "Bush 8\\'\\'", "Archos 70 Carbon": "Bush MyTablet 7", "BUSH 7.0 TABLET": "Bush MyTablet 7", "Bush Spira B1 10.1\"": "Bush Spira B1 10.1\\'\\'", "Bush Spira B1 8\"": "Bush Spira B1 8\\'\\'", "Archos Chefpad": "ChefPad", "Archos 55 Diamond 2 Plus": "Diamond 2 plus", "Archos 55 Diamond Plus": "Diamond Plus", "Archos Diamond Plus": "Diamond Plus", "Archos Diamond S": "Diamond S", "ARCHOS FAMILYPAD 2": "FamilyPad 2", "Logic Fieldbook G1": "Fieldbook G1", "ARCHOS GAMEPAD": "GamePad", "ARCHOS GAMEPAD2": "GamePad 2", "KODAK Tablet 10": "Kodak Tab 10", "KODAK Tablet 7": "Kodak Tab 7", "KUNO4": "Kuno", "BUSH 10.1 TABLET": "My Tablet 101", "QILIVE 101": "QiLive 101", "Qilive 97R-2": "Qilive 97R2", "Qilive 79": "Qilive79", "Qilive 70v2": "Qilive7V2", "A80RG11": "Quechua Tablet 8", "Archos Smart Home Tablet": "Smarthome La Poste", "ARCHOS LUDOG10": "TV Connect", "Alba 10\"": "alba 10", "Benefit_M551": "Bebefit M551", "Benefit_M503": "Benefit M503", "Benefit_M505": "Benefit M505", "Benefit_M8": "Benefit M8", "Benefit_Note_1": "Benefit_Note 1", "Impulse_P2": "Impulse P2", "Wizard_1": "Wizard 1", "U5": "Artel U5", "U3_4G": "U3 4G", "SH1": "Ascom Myco Wi-Fi", "Jazz": "JAZZ", "A912": "polaris_wifionly", "ASUS_Z00YD": "ASUS Live (G500TG)", "P023": "ZenPad 10 (Z300C)", "P01T": "ASUSPRO Tablet (M1000CL)", "P01W": "ZenPad 7.0 (Z370C)", "P002": "ZenPad 7.0 (Z370KL)", "ASUS Chromebook C202SA": "Chromebook C202SA/C300SA/C301SA", "ASUS Chromebook Flip C100PA": "Chromebook Flip C100PA", "ASUS Chromebook Flip C101PA": "Chromebook Flip C101PA", "bob": "Chromebook Flip C101PA", "P00C": "ZenPad 10 (Z300M)", "P00A": "ZenPad 8.0 (Z380M)", "asus_google_cube": "Cube", "Transformer TF101": "Eee Pad Transformer", "Transformer TF101G": "Eee Pad", "Slider SL101": "EeePad Slider SL101", "TF101": "Eee Pad TF101", "TF101-WiMAX": "Eee Pad TF101-WiMAX", "TF201": "Eee Pad Transformer Prime", "Transformer Prime TF201": "Eee Pad Transformer Prime", "Transformer TF201": "Eee Pad Transformer Prime", "K012": "Fonepad 7 (FE170CG)", "K01N": "Fonepad 7 (FE171CG)", "K01F": "Fonepad 7 (FE171MG)", "K019": "Fonepad 7 (FE375CXG)", "K00Z": "Fonepad 7 (ME175CG)", "K00E": "Fonepad 7 (ME372CG)", "K01Q": "Fonepad 7 LTE (FE375CL)", "K00Y": "Fonepad 7 LTE (ME372CL)", "K016": "Fonepad 8 (FE380CXG)", "ME371MG": "Fonepad ME371MG", "K00G": "Fonepad Note 6 (ME560CG)", "ME172V": "MeMO PAD", "K01E": "MeMO Pad (ME103K)", "K00F": "MeMO Pad 10 (ME102A)", "K012_2": "MeMO Pad 7 (FE7010CG)", "K017": "MeMO Pad 7 (ME170C)", "K01U": "MeMO Pad 7 (ME171C)", "K013": "MeMO Pad 7 (ME176CX)", "K013C": "MeMO Pad 7 (ME176CE)", "K007": "MeMO Pad 7 (ME572C)", "K01A": "MeMO Pad 7 (ME70C)", "ASUS MeMO Pad 7": "MeMO Pad 7 LTE (ME375CL)", "K00R": "MeMO Pad 7 LTE (ME572CL)", "K00X": "MeMO Pad 7 LTE (ME7530CL)", "AST21": "MeMO Pad 8 (AST21)", "K011": "MeMO Pad 8 (ME181CX)", "K01H": "MeMO Pad 8 (ME581C)", "K015": "MeMO Pad 8 (ME581CL)", "ME302KL": "MeMO Pad FHD 10 (ME302KL)", "ME173X": "MeMO Pad HD 7 (ME173X)", "K00U": "MeMo Pad HD 7 (ME173XX)", "K00L": "MeMO Pad HD 8 (ME180A)", "ASUS K00S": "MeMO Pad HD7 Dual SIM (ME175KG)", "ME301T": "MeMO Pad Smart 10", "ME302C": "MeMo Pad 10 (ME302C)", "Nexus 7": "Nexus 7 (2013)", "Garmin-Asus A50": "Nuvifone", "PadFone T008": "PadFone E (A68M)", "PadFone T00C": "PadFone mini", "ASUS_T00N": "PadFone S (PF500KL)", "ASUS PadFone X": "PadFone X (A91)", "ASUS PadFone X mini": "PadFone X mini (PF450CL)", "ASUS_T00T": "PadFone X mini (PF450CL)", "ASUS_T00E": "PadFone mini", "P00L": "ZenPad 10 (Z301ML)", "RTC-tablet": "RTC-700A", "T10xTA": "T101TA", "ASUS Pad TF700T": "TF700T", "ASUS Transformer Pad TF700T": "TF700T", "PadFone T004": "The new PadFone Infinity (A86)", "ASUS Tablet P1801-T": "Transformer AiO P1801", "TX201LA": "Transformer Book Trio", "ASUS Tablet P1802-T": "Transformer AiO P1802", "K010": "Transformer Pad (TF103C)", "ASUS Pad TF300T": "Transformer Pad", "ASUS Transformer 300": "Transformer Pad", "ASUS Transformer Pad TF300T": "Transformer Pad", "K010E": "Transformer Pad (TF103CE)", "K018": "Transformer Pad (TF103CG)", "K014": "Transformer Pad (TF303CL)", "K01B": "Transformer Pad (TF303K)", "ASUS Transformer Pad TF700KL": "Transformer Pad Infinity", "K00C": "Transformer Pad Infinity (TF701T)", "ASUS Transformer Pad TF300TG": "Transformer Pad TF300TG", "ASUS Transformer Pad TF300TL": "Transformer Pad TF300TL", "ASUS Transformer Pad TF502T": "Transformer Pad TF502T", "ASUS Transformer Pad TF600T": "Transformer Pad TF600T", "ASUS ZenFone 2": "ZenFone 2 (ZE500CL)", "ASUS ZenFone 2E": "ZenFone 2 (ZE500CL)", "Z00D": "ZenFone 2 (ZE500CL)", "ASUS_Z008D": "ZenFone 2 (ZE550ML)", "ASUS_Z00AD": "ZenFone 2 (ZE551ML)", "ASUS_Z00ADA": "ZenFone 2 (ZE551ML)", "ASUS_Z00ADB": "ZenFone 2 (ZE551ML)", "ASUS_Z00RD": "ZenFone 2 Laser (ZE500KG)", "ASUS_Z00ED": "ZenFone 2 Laser (ZE500KL)", "ASUS_Z00EDB": "ZenFone 2 Laser (ZE500KL)", "ASUS_Z00WD": "ZenFone 2 Laser (ZE550KG)", "ASUS_Z00LD": "ZenFone 2 Laser (ZE550KL)", "ASUS_Z00LDC": "ZenFone 2 Laser (ZE550KL)", "ASUS_Z00TD": "ZenFone 2 Laser (ZE551KL)", "ASUS_Z00MD": "ZenFone 2 Laser (ZE600KL)", "ASUS_Z011D": "ZenFone 2 Laser (ZE601KL)", "ASUS_Z017D": "ZenFone 3 (ZE520KL)", "ASUS_Z017DA": "ZenFone 3 (ZE520KL)", "ASUS_Z012D": "ZenFone 3 (ZE552KL)", "ASUS_Z012DA": "ZenFone 3 (ZE552KL)", "ASUS_Z012DE": "ZenFone 3 (ZE552KL)", "ASUS_Z012S": "ZenFone 3 (ZE552KL)", "ASUS_Z01FD": "ZenFone 3 Deluxe (ZS550KL)", "ASUS_Z016D": "ZenFone 3 Deluxe (ZS570KL)", "ASUS_Z016DA": "ZenFone 3 Deluxe (ZS570KL)", "ASUS_Z016S": "ZenFone 3 Deluxe (ZS570KL)", "ASUS_Z01BD": "ZenFone 3 Laser (ZC551KL)", "ASUS_Z01BDA": "ZenFone 3 Laser (ZC551KL)", "ASUS_Z01BDC": "ZenFone 3 Laser (ZC551KL)", "ASUS_Z01BS": "ZenFone 3 Laser (ZC551KL)", "ASUS_X008D": "ZenFone 3 Max (ZC520TL)", "ASUS_X008DA": "ZenFone 3 Max (ZC520TL)", "ASUS_X008DB": "ZenFone 3 Max (ZC520TL)", "ASUS_X008DC": "ZenFone 3 Max (ZC520TL)", "ASUS_X00DD": "ZenFone 3 Max (ZC553KL)", "ASUS_X00DDA": "ZenFone 3 Max (ZC553KL)", "ASUS_A001": "ZenFone 3 Ultra (ZU680KL)", "ASUS_Z01HD": "ZenFone 3 Zoom (ZE553KL)", "ASUS_Z01HDA": "ZenFone 3 Zoom (ZE553KL)", "ASUS_X00GD": "ZenFone 3s Max (ZC521TL)", "ASUS_T00I": "ZenFone 4 (A400CG)", "ASUS_T00I-D": "ZenFone 4 (A400CG)", "ASUS_T00Q": "ZenFone 4 (A450CG)", "ASUS_Z01KD": "ZenFone 4 (ZE554KL)", "ASUS_Z01KS": "ZenFone 4 (ZE554KL)", "ASUS_Z01KDA": "ZenFone 4 (ZE554KL)", "ASUS_X00HD": "ZenFone 4 Selfie Lite (ZB520KL)", "ASUS_X00ID": "ZenFone 4 Max (ZC554KL)", "ASUS_Z01GD": "ZenFone 4 Pro (ZS551KL)", "ASUS_X00LD": "ZenFone 4 Selfie (ZD553KL)", "ASUS_X00HDA": "ZenFone 4 Selfie Lite (ZB520KL)", "ASUS_Z01MD": "ZenFone 4 Selfie Pro (ZD552KL)", "ASUS_Z01MDA": "ZenFone 4 Selfie Pro (ZD552KL)", "ASUS_T00F": "ZenFone 5 (A500CG)", "ASUS_T00J": "ZenFone 5 (A501CG)", "ASUS_T00K": "ZenFone 5 (A502CG)", "ASUS_X00QD": "ZenFone 5 (ZE620KL)", "ASUS_X00QSA": "ZenFone 5 (ZE620KL)", "ZE620KL": "ZenFone 5 (ZE620KL)", "ASUS_T00P": "ZenFone 5 LTE (A500KL)", "ASUS_X017D": "ZenFone 5 Lite (ZC600KL)", "ASUS_X017DA": "ZenFone 5 Lite (ZC600KL)", "ZC600KL": "ZenFone 5 Lite (ZC600KL)", "ZS620KL": "ZenFone 5Z (ZS620KL)", "ASUS_Z01RD": "ZenFone 5Z (ZS620KL/ZS621KL)", "ASUS_T00G": "ZenFone 6 (A600CG)", "ASUS_Z002": "ZenFone 6 (A601CG)", "ASUS_A002A": "ZenFone AR", "ASUS_A002": "ZenFone Ares (ZS572KL)", "ASUS_Z007": "ZenFone C (ZC451CG)", "ASUS_X003": "飛馬 (T500KLC)", "ASUS_X009DB": "ZenFone Go (ZB450KL)", "ASUS_X014D": "ZenFone Go (ZB452KG)", "ASUS_X00BD": "Zenfone Go (ASUS_X00BD)", "ASUS_X00AD": "ZenFone Go (ZB500KL)", "ASUS_X013DA": "ZenFone Go (ZB551KL)", "ASUS_X013DB": "ZenFone Go (ZB551KL)", "ASUS_X007D": "ZenFone Go (ZB552KL)", "ASUS_L001": "ZenFone Go (ZB690KG)", "ASUS_Z00SD": "ZenFone Go (ZC451TG)", "ASUS_Z00VD": "ZenFone Go (ZC500TG)", "ASUS_A007": "ZenFone Live (ZB501KL)", "ASUS_X00RD": "ZenFone Live L1 (ZA550KL)", "ZA550KL": "ZenFone Live L1 (ZA550KL)", "G552KL": "ZenFone Live L1 (ZA550KL)", "ASUS_X00LDB": "ZenFone Live Plus (ZB553KL)", "ASUS_X00LDA": "ZenFone Live Plus (ZB553KL)", "ZB553KL": "ZenFone Live Plus (ZB553KL)", "ASUS_Z010D": "ZenFone Max (ZC550KL)", "ASUS_Z010DA": "ZenFone Max (ZC550KL)", "ASUS_Z010DB": "ZenFone Max (ZC550KL)", "ASUS_Z010DD": "ZenFone Max (ZC550KL)", "ASUS_X00PD": "ZenFone Max M1 (ZB555KL)", "ZB555KL": "ZenFone Max M1 (ZB555KL)", "ASUS_X018D": "ZenFone Max Plus M1 (ZB570TL)", "ASUS_X00TD": "ZenFone Max Pro (M1)", "ASUS_X00TDB": "ZenFone Max Pro (M1)", "ZB602KL": "ZenFone Max Pro (M1)", "ASUS_Z00UD": "ZenFone Selfie (ZD551KL)", "ASUS_Z00UDA": "ZenFone Selfie (ZD551KL)", "ASUS_A006": "ZenFone V", "ASUS_A009": "ZenFone V Live", "ASUS_Z00XS": "ZenFone Zoom (ZX551ML)", "ASUS_Z00XSA": "ZenFone Zoom (ZX551ML)", "ASUS_Z00XSB": "ZenFone Zoom (ZX551ML)", "P021": "ZenPad 10 (Z300CG)", "P01T_1": "ZenPad 10 (Z300CL)", "P028": "ZenPad 10 (Z301MF)", "P008": "ZenPad Z8", "P027": "ZenPad 3S 10 (Z500M)", "ASUS_P00I": "ZenPad 3S 10 LTE (Z500KL)", "P01V": "ZenPad 7.0 (Z370CG)", "P024": "ZenPad 8.0 (Z380KL)", "P01Y": "ZenPad C 7.0 (Z170CG)", "P01Y_S": "ZenPad C 7.0", "P01Z": "ZenPad C 7.0 (Z170C)", "P001": "ZenPad C 7.0 (Z170MG)", "P01M": "ZenPad S 8.0 (Z580C)", "P01MA": "ZenPad S 8.0 (Z580CA)", "P00I": "ZenPad Z10", "ASUS_P00J": "ZenPad Z8s", "P001_2": "ZenPadC 7.0 (Z170MG)", "ASUS ZenWatch": "ZenWatch", "ASUS ZenWatch 2": "ZenWatch 2", "ASUS ZenWatch 3": "ZenWatch 3", "Zenbo": "Zenbo Qrobot", "P022": "Zenpad 8.0 (Z380C)", "ASUS_X002": "飛馬 (T500TLT)", "ASUS_X005": "飛馬 5000 (T551TLC)", "ASUS_X550": "飛馬2 Plus (T550KLC)", "ZT-701": "ZOOTI PAD ZT-701", "Q7T9INK": "AUCHAN", "Q4514": "Q.4514", "Q4T10INK": "QILIVE", "X35T": "Selecline X35T", "Q.4094": "Smartphone 5\" Q.4094", "Audi tablet": "Audi Tab CN", "RSEIII": "RSE-III", "T752": "T752 Tablet", "T852": "T852 Tablet", "Avaya Vantage": "Vantage", "K175": "Vantage", "K165": "Vantage", "Avvio_A400": "Avvio A400", "Avvio_Pro450": "Avvio PRO450", "Avvio_Pro550": "Avvio PRO550", "Avvio_A50": "Avvio Platinum A50", "Axioo_AX4": "Axioo AX4", "A40_Style_Plus": "A40 Style Plus", "A50_Style_Plus": "A50 Style Plus", "Azumi AX5": "AX5", "Azumi_Daburu_A55O": "AZUMI_Daburu_A55O", "Azumi Extend Akaru 55 QL": "Azumi_Extend_Akaru_55_QL", "Azumi_DOSHI_A55_QL": "DOSHI A55 QL", "Azumi_IRO_A4_Q": "IRO A4Q", "Azumi_IRO_A5_QL": "IRO A5QL", "Azumi_IRO_A5_QLT": "IRO A5 QLT", "Azumi_IRO_A55_QL": "IRO A55 QL", "Azumi_IRO_A5_Q": "IRO A5Q", "Azumi IRO A5QL V2": "IRO A5QL", "Azumi_IRO_A4_Q_PRO": "IRO_A4_Q_Pro", "Azumi IRO A55 Q Pro": "IRO_A55_Q_Pro", "IRO A6 Q": "IRO_A6_Q", "Azumi_KINZO_A55_OLi": "KINZO A55QL", "KINZO_ichi_A5_QL": "KINZO ICHI A5 QL", "Speed_55": "Speed 55", "Azumi_T7_3G": "T7 3G", "Bphone B2017": "B2017", "Bphone B1111": "Bphone", "Bphone B1112": "Bphone", "Bphone B1114": "Bphone", "Bphone B1115": "Bphone", "Bphone B1116": "Bphone", "Bmobile AX1010": "AX1010", "AX1045": "AX1045E", "AX1070": "AX1070E", "Bmobile_AX1091": "AX1091", "Bmobile_AX685": "AX685", "AX7OO": "AX700", "Bmobile_AX810": "AX810", "Bmobile_AX921": "AX921", "BQru-5060": "5060", "BQ-5701L": "5701L Slim", "BQru-5503": "BQ 5503 NICE 2", "BQ-1045": "BQ-1045G", "BQru-1056L": "BQ-1056L", "BQru-1057L": "BQ-1057L", "BQru-4028": "BQ-4028UP!", "BQru-4072": "BQ-4072 Strike Mini", "BQru-4500": "BQ-4500L", "BQ-4585": "BQ-4585 Fox View", "BQru-5000": "BQ-5000L", "BQ-5001L": "BQ-5001L Contact", "BQ-5003L": "BQ-5003L Shark Pro", "BQ-5005L": "BQ-5005L INTENSE", "BQ-5007L": "BQ-5007L IRON", "BQ-5008L": "BQ-5008L Brave", "BQru-5033": "BQ-5033 Shark", "BQru-5035": "BQ-5035 Velvet", "BQru-5044": "BQ-5044 Strike LTE", "BQ-5056": "BQ-5056 Fresh", "BQru-5057": "BQ-5057 Strike 2", "BQru_BQru-5058": "BQ-5058 Strike Power Easy", "BQru-5059": "BQ-5059 Strike Power", "BQru-5201": "BQ-5201", "BQru-5202": "BQ-5202", "BQru-5203": "BQ-5203 Shark", "BQru-5204": "BQ-5204 Strike Selfie", "BQ-5206L": "BQ-5206L Balance", "BQ-5340": "BQ-5340 Choice", "BQ-5500L": "BQ-5500L Advance", "BQru-5504": "BQ-5504 Strike Selfie Max", "BQ-5507L": "BQ-5507L IRON MAX", "BQru-5510": "BQ-5510 Strike Power Max 4G", "BQ-5512L": "BQ-5512L STRIKE FORWARD", "BQ-5517L": "BQ-5517L TWIN PRO", "BQru-5521": "BQ-5521 STRIKE POWER MAX", "BQ-5522": "BQ-5522 Next", "BQru_5590": "BQ-5590 Spring", "BQ-5591": "BQ-5591 Jeans", "BQ-5594": "BQ-5594 Strike Power Max", "BQ-5700L": "BQ-5700L Space X", "BQ-5707G": "BQ-5707G Next Music", "BQ-6000L": "BQ-6000L Aurora", "BQ-6001L": "BQ-6001 L", "BQ-6015L": "BQ-6015L Universe", "BQ-7022": "BQ-7022G", "BQru-7081": "BQ-7081G", "BQ-1077L": "BQru-1077L", "BQ-1082G": "BQru-1082G", "BQ-1083G": "BQru-1083G", "BQru-5037": "Bqru-5037", "BQru-5054": "CRYSTAL", "BQru-4583": "FOX POWER", "Smart 502": "FarEastone Smart 502", "G3": "INHON G3", "E815": "K-Touch E815", "moii E996+": "Moii E996+", "Digma Linx 4.5 PT452E": "PT452E", "PAP5430": "Prestigio PAP5430", "S450": "SOLO S450", "Smart402": "Smart 402", "S350": "Solo S350", "W032I": "WISKY W032I", "XOLO X910": "X910", "Vexia Zippers": "Zippers", "QM153E": "BeoVision", "Cavion_Solid_4_5": "Cavion Solid 4.5", "BNTV400": "NOOK® HD", "BNTV600": "NOOK® HD+", "BNTV450": "Nook Tablet 7”", "Becrypt Convex 430": "Convex 430", "Becrypt Indigo 430": "Convex 430", "Beeline Pro 4": "Beeline Pro 4", "Beeline Tab Fast 2": "Beeline Tab Fast 2", "Beeline Tab Pro": "Beeline Tab Pro", "Beeline Fast": "Fast", "Beeline Fast HD": "Fast HD", "Beeline Fast +": "Fast-Plus", "Beeline Pro 2": "Pro 2", "Beeline_Pro_3": "Pro 3", "Beeline_Pro_6": "Pro 6", "A451": "Pro5", "Beeline Smart 6": "Smart 6", "Beeline Smart Dual": "Smart Dual", "A221": "Smart_8", "A239": "Smart_8", "Beeline Tab": "Tab", "Tab_2": "Tab 2", "Beeline_Tab_IS": "Tab IS", "Beeline_Tab_Fast": "Tab_Fast", "BenQ A3c": "A3c", "Agora 4G Pro": "Agora_4G_Pro", "Agora Lite": "Agora_Lite", "B502_SA": "B502", "B506_TW": "B506", "BenQ A3s": "F4", "BenQ F5": "F5", "F52_05": "F52", "BenQ F55": "F55", "BenQ F55J": "F55J", "Harrier from EE": "Harrier", "Harrier Mini from EE": "Harrier Mini", "Harrier Tab from EE": "Harrier Tab", "Agora 4G+": "Kogan 4G+", "BenQ T3": "T3_17A", "T47_05": "T47", "BENTLEY ENTERTAINMENT TABLET": "Tab", "Capture+": "Billion Capture+", "SMART63": "Smart 63", "SMART66": "Smart 66", "PRO9": "Pro 9", "NID_7010": "eZee’Tab7D14-S", "S952": "MID_9526CM", "Tab770": "LUXYA MID704DC Tablet / Bitmore Tab770", "Bittium Tough Mobile": "Tough Mobile", "BBC100-1": "Aurora", "BBF100-1": "BlackBerry KEY2", "BBF100-2": "BlackBerry KEY2", "BBF100-4": "BlackBerry KEY2", "BBF100-6": "BlackBerry KEY2", "BBF100-8": "BlackBerry KEY2", "BBF100-9": "BlackBerry KEY2", "BBB100-7": "Blackberry Keyone", "BBD100-1": "BlackBerry MOTION", "BBD100-2": "BlackBerry MOTION", "BBD100-6": "BlackBerry MOTION", "STH100-1": "DTEK50 by BlackBerry", "STH100-2": "DTEK50 by BlackBerry", "BBA100-1": "DTEK60 by BlackBerry", "BBA100-2": "DTEK60 by BlackBerry", "BBB100-1": "KEYone", "BBB100-2": "KEYone", "BBB100-3": "KEYone", "BBB100-4": "KEYone", "BBB100-5": "KEYone", "BBB100-6": "KEYone", "STV100-1": "PRIV by BlackBerry", "STV100-2": "PRIV by BlackBerry", "STV100-3": "PRIV by BlackBerry", "STV100-4": "PRIV by BlackBerry", "A7Pro": "A7PRO", "A9_Pro": "A9 Pro", "BV4000Pro-RU": "BV4000Pro_RU", "BV5800 PRO": "BV5800PRO", "BV5800Pro_RU": "BV5800PRO_RU", "SOLID_4G1": "BV6000", "BV6000S": "BV6000s", "BV7000 Pro": "BV7000Pro_RU", "BV7000": "BV7000_RU", "BV8000Pro": "BV8000 Pro", "BV9000Pro": "BV9000 Pro", "BV9000Pro-F": "BV9000 Pro-F", "BV9000Pro-RU": "BV9000-RU", "A10": "Blackview A10", "A20Pro": "Blackview A20 Pro", "BV4000": "Blackview BV4000", "BV4000Pro": "Blackview BV4000Pro", "P2": "Blackview P2", "E7s": "E7S", "P10000_Pro": "P10000 Pro", "P2Lite": "P2 Lite", "SOLID_4G3": "SOLID-4G3", "SOLID 4 G2": "SOLID_4_G2", "BLU ADVANCE 4.0 L2": "ADVANCE 4.0 L2", "Advance 4.0 L3": "ADVANCE 4.0 L3", "Advance 5.0 HD": "ADVANCE 5.0 HD", "Studio M4": "Advance 4.0M", "Advance 5.2": "Advance_5_2", "Advance A7": "Advance_A7", "Advance A5 Plus LTE": "Advance A5 Plus LTE", "Grand M3": "BLU Grand M3", "BLU_S1": "BLU S1", "Studio J8 LTE": "BLU STUDIO J8 LTE", "BLU STUDIO G2": "BLU_STUDIO_G2", "Studio G Max": "BLU_Studio_G_Max", "Vivo XL2": "BLU_Vivo_XL2", "BLU DASH L2": "DASH L2", "BLU DASH M2": "DASH M2", "BLU DASH X LTE": "DASH X LTE", "BLU DASH X2": "DASH X2", "BLU DASH X": "Dash X", "Studio M5 Plus": "Dash XL", "Dash L3": "Dash_L3", "ENERGY XL": "ENERGY  XL", "BLU ENERGY DIAMOND": "ENERGY DIAMOND", "ENERGY_DIAMOND_MINI": "ENERGY DIAMOND MINI", "BLU ENERGY M": "ENERGY M", "BLU ENERGY X PLUS 2": "ENERGY X PLUS 2", "BLU GRAND 5.5 HD": "GRAND 5.5 HD", "Grand Max": "Grand MAX", "BLU Grand X LTE": "Grand X LTE", "Grand M2": "Grand_M2", "Grand M2 LTE": "Grand_M2_LTE", "Grand X": "Grand_X", "BLU LIFE ONE X": "LIFE ONE X", "Life One X": "LIFE ONE X", "Life One X2": "LIFE ONE X2", "Life One X2 Mini": "LIFE ONE X2 MINI", "BLU LIFE XL": "LIFE XL", "BLU LIFE MARK": "Life Mark", "BLU NEO ENERGY MINI": "NEO ENERGY MINI", "BLU NEO X": "NEO X", "BLU NEO X LTE": "NEO X LTE", "BLU NEO X MINI": "NEO X MINI", "BLU NEO X PLUS": "NEO X PLUS", "BLU NEO XL": "NEO XL", "Pure XR": "PURE XR", "Pure View": "Pure_View", "BLU R1 HD": "R1 HD", "R1 PLUS": "R1 Plus", "R2 3G": "R2_3G", "BLU STUDIO 7.0 LTE": "STUDIO 7.0 LTE", "BLU STUDIO C 8+8 LTE": "STUDIO C 8+8 LTE", "BLU STUDIO G": "STUDIO G", "BLU Studio G HD": "STUDIO G HD", "Studio G HD LTE": "STUDIO G HD LTE", "BLU STUDIO G PLUS": "STUDIO G PLUS", "Studio G Plus HD": "STUDIO G PLUS HD", "Studio Max": "STUDIO MAX", "BLU STUDIO ONE PLUS": "STUDIO ONE PLUS", "BLU STUDIO SELFIE 2": "STUIDIO SELFIE 2", "BLU Studio Touch": "STUDIO TOUCH", "BLU STUDIO XL LTE": "STUDIO XL LTE", "BLU STUDIO C 8+8": "STUIDIO C 8+8", "STUDIO ENERGY 2": "SUTDIO ENERGY 2", "STUDIO 5.5 HD": "Studio 5.5 HD", "BLU STUDIO C HD": "Studio C HD", "STUDIO_G_HD": "Studio G HD", "Advance A4": "Studio J1", "Advance A5": "Studio J2", "Studio M5": "Studio J2", "BLU STUDIO ONE": "Studio One", "BLU STUDIO SELFIE LTE": "Studio Selfie LTE", "BLU STUDIO X MINI": "Studio X Mini", "Studio J8M": "Studio_J8M", "Studio View": "Studio_View", "Studio M6 LTE": "Studio_XL_2", "Studio XL 2": "Studio_XL_2", "BLU TOUCHBOOK M7": "TOUCHBOOK M7", "Vivo 5R": "VIVO 5R", "Vivo 6": "VIVO 6", "Vivo X": "Vivo X WW", "Vivo 8L": "Vivo_8L_UU", "Vivo 8": "Vivo_8_LL", "Vivo One Plus": "Vivo_One_Plus", "D2_Pro": "D2 Pro", "S8_plus_a": "S8 Plus a", "Cybook-Tablet": "Cybook Tablet", "MoovaShuffle": "Moova Shuffle", "Moova-Soul": "Moova Soul", "Jive": "Pulse Jive", "Power": "myPhone_Power", "falcon": "Falcon", "BouygtelTV": "Bbox Miami", "BRAVIS X500": "X500", "M8047IU": "M8046IU", "E81": "BT Home SmartPhone III", "BT Home SmartPhone S II": "HomeSmartphone d800", "Brondi 620 SZ": "620SZ", "Brondi_730_4G_HD": "730 4G HD", "brown 2": "Brown2", "S31": "Cat S31", "Bush 5 Android": "5 android", "BUSH 7.85 TABLET": "MyTablet 79", "BUSH SPIRA B3 5": "SPIRA B3 5", "BUSH SPIRA B4 5": "SPIRA B4 5", "BUSH SPIRA B4 5.5": "SPIRA B4 5.5", "BUSH SPIRA D3 5.5": "SPIRA D3 5.5", "BUSH SPIRA D4 5": "SPIRA D4 5", "BUSH SPIRA E3X 5.5": "SPIRA E3X 5.5", "BUSH SPIRA E4X": "SPIRA E4X", "Bush Spira B2 10 tablet": "Spira B2 10 tablet", "Bush Spira B2 7 tablet": "Spira B2 7 tablet", "BUSH SPIRA D4 5.5": "Spira D4 5.5", "Bush Spira E2X 5\" Smartphone": "Spira E2X 5\\'\\'", "SX930C-CC": "Smart TV II", "noaXPower": "Noa X Power", "AIrStick": "AirStick", "TStick": "TSUTAYA Stick", "Blaze G": "Blaze  G", "CG_EON_Blaze_Pro": "EON Blaze Pro", "Omega 8": "OMEGA 8", "CG_OMEGA6": "Omega6", "GX-CJ680CL": "CJ680CL", "SX930C_CJ": "Hello TV Smart", "kr101": "viewing", "A7009": "Retailer Stores", "M7L_Sapphire": "Mint_Iris", "M5E01": "Mint_Jane", "CamPad_P7": "CamPad P7", "Hero_H7_Plus": "Hero H7 Plus", "Hero_H9": "Hero H9", "Hero SX": "Hero_SX", "S70CDS": "OnePlace", "Captiva Pad 10 3G Plus": "CAPTIVA Pad 10 3G Plus", "TVE9603I": "CT1050", "CASIO WSD-F10": "Smart Outdoor Watch WSD-F10", "CASIO WSD-F20": "WSD-F20", "CASIO WSD-F20S": "WSD-F20", "CASPER_L10_4.5G": "CASPER_L10_4_5G", "CASPER_VIA_A2": "VIA A2", "CASPER_VIA_G1": "VIA G1", "CASPER_VIA_G1_Plus": "VIA G1 Plus", "CASPER_VIA_M3": "VIA M3", "VIA-T7D": "VIA T7D", "VIA-T7D-3G": "VIA T7D 3G", "VIA_F1": "VIA_A1_1", "S41": "Cat S41", "S61": "Cat S61", "S50c": "CatS50c", "Cavion_Base_5_0": "Base_5.0", "A81F": "Ibirapita", "CliQ2": "CliQ 2", "UniQ": "uniQ", "CELLC_Evolve": "Cell C Evolve", "CELLC_Nitro": "Cell C Nitro", "CELLC_Extreme": "CellC_Extreme", "Cell_C_Fame": "FAME", "Cell_C_Summit_Plus": "Summit Plus", "Wiz": "WIZ", "Deluxe": "deluxe", "C8690": "CJ-1984", "ELITE 4.7 HD": "CJ-1984", "HW-W820": "HWW820", "i-mobile IQ1-1": "IQ 1.1", "Q-Smart S21": "S21", "C8660": "SM55", "i-mobile i-STYLE 7": "i-STYLE7", "i-mobile i-STYLE 7A": "i-STYLE7A", "i-mobile IQ XA": "i-mobile IQ X", "i-mobile IQ X2": "i-mobile IQ X2A", "Centric CM3331": "Centric L3", "CM4331": "G1", "CTLPlayer": "PureTV", "S60CLI": "PureTV", "CM-7600": "Stream+", "JR_MB603": "JR-MB603", "W900 LTE": "Cherry W900 LTE", "Desire_R6_Lite": "Desire R6 Lite", "Flare_5": "Flare 5", "FlareA1": "Flare A1", "Flare_A2_Lite": "Flare A2 Lite", "Cherry_X740": "Flare A5", "Flare_HD_4": "Flare HD 4", "Flare_HD_MAX": "Flare HD Max", "Flare_J2_2018": "Flare J2 2018", "Flare_J2_Lite": "Flare J2 Lite", "FlareJ3": "Flare J3", "Flare_J3": "Flare J3", "FlareJ3Plus": "Flare J3 Plus", "Flare_J3_Plus": "Flare J3 Plus", "Flare_Lite_3S": "Flare Lite 3S", "Flare_P1_Lite": "Flare P1 Lite", "Flare_P1_Mini": "Flare P1 Mini", "Flare_P3": "Flare P3", "Flare_P3_Plus": "Flare P3 Plus", "Flare_P3_lite": "Flare P3 lite", "FlareS5LiteDTV": "Flare S5 Lite DTV", "FLARE S5 MAX": "Flare S5 Max", "Flare_S6_Max": "Flare S6 Max", "Flare_S6_Plus": "Flare S6 Plus", "FLARE S6 POWER": "Flare S6 Power", "Flare_X_V2": "Flare X", "iris": "Iris", "CX940": "Lenoxx", "Omega Icon Lite 2": "Omage Icon Lite 2", "OMEGA HD 3S": "Omega HD 3S", "Omega_HD_4": "Omega HD 4", "Omega_HD_Duo": "Omega HD Duo", "Omega HD 3": "Omega HD3", "Omega_Lite_3C": "Omega Lite 3C", "omega_lite_4": "Omega Lite 4", "H940": "One", "Rover_2": "Rover 2", "Selfie_Two": "Selfie Two", "Superion Radar Deluxe": "Superion Radar Duluxe", "Cherry_Mobile_Touch_HD": "Touch HD", "M651G": "A3", "M823": "n1 max", "CipherLab RS30": "RS30", "RS50": "Saturn", "CP-DX70": "Desktop Collaboration Experience DX70", "CP-DX80": "Desktop Collaboration Experience DX80", "Life 10 Pro": "Life_10_Pro", "Life Pro 7": "Life_Pro_7", "Clempad2_special": "Clempad 4.4 Basic Special", "Clempad2_plus": "Clempad 4.4 Plus", "Clempad2_XL": "Clempad 4.4 XL", "Clempad_HR_XL": "Clempad 5.0 XL", "Clempad_6": "Clempad 6.0", "Clempad_6_XL": "Clempad 6.0 XL", "Clempad_8": "Clempad 8", "CLEMPADCALL": "Clempad Call", "Clempad_HR": "Clempad HR", "Clempad_HR_Plus": "Clempad HR Plus", "ClemPhone": "Clemphone", "ClemPhone_7": "Clemphone 7.0", "MFC_6": "My First Clempad 6.0", "MFC_7": "My First Clempad 7", "MFC_HR": "My First Clempad HR", "MFC_HR_Plus": "My First Clempad HR Plus", "MFC2_Special": "My first Clempad 4.4 Basic Special", "MFC2_Plus": "My first Clempad 4.4 Plus", "I7043G": "Tab 7\"", "CK07T": "ClickN Kids", "Next Infinity Plus": "CloudFone Next Infinity Plus", "Next Infinity Pro": "CloudFone Next Infinity Pro", "Thrill Boost 3": "CloudFone Thrill Boost 3", "Thrill Plus 2": "CloudFone Thrill Plus 2", "Thrill Snap": "CloudFone Thrill Snap", "one695_1": "Cloudpad One 6.95", "one695_1_coho": "Cloudpad One 6.95", "one7_0_4": "Cloudpad One 7.0", "one7_0_4_coho": "Cloudpad One 7.0", "one8_0_1": "Cloudpad One 8.0", "one8_0_1_coho": "Cloudpad One 8.0", "Colors P45": "P45", "Colors P50 Plus": "P50_Plus", "Colors P65": "P65", "P60": "PRIDE 5E", "Colors S1": "S1", "Colors S11": "S11", "Colors S9": "S9", "Comio C2 Lite": "COMIO C2 Lite", "PGN-507": "PGN507", "Allure M1": "Allure  M1", "PGN613": "Allure A55 Plus", "PGN-508": "C6+", "PGN-506": "C7", "C-6": "C_5", "PHQ526": "G6 Pro", "PHQ520": "Griffe G5", "PAM524": "Griffe G5 Plus", "SP413": "Griffe T1", "PGN527": "Plume P4 Plus", "PGN528": "Plume P6 Pro LTE", "PGN610": "Plume P8 Lite", "Griffe T2": "SP530", "TGW710G": "T705", "CNT07002": "Connect Alpha", "CP6001A": "Connect Core 6", "Coolpad 3300A": "3300A", "Coolpad 3320A": "3320A", "Coolpad 3503I": "3503I", "Coolpad CP3503I": "3503I", "Coolpad E503": "3505I_U00", "3600I": "3600i", "Coolpad 3600I": "3600i", "Coolpad 3622A": "3622A-mpcs", "Coolpad 3623A": "3623A", "Coolpad 3632A": "3632A-mpcs", "cp3636a": "Coolpad 3636a_m", "CP3700A": "3700A", "Coolpad 5109": "5109", "Coolpad 5200": "5200", "Coolpad 5216D": "5216D", "Coolpad 5217": "5217", "Coolpad 5218S": "5218S", "Coolpad 5219": "5219", "Coolpad 5219_C00": "5219_C00", "Coolpad 5267": "5267C", "Coolpad 5270": "5270", "Coolpad 5367": "5367", "Coolpad 5367C": "5367C", "Coolpad 5370": "5370", "Coolpad 5380CA": "5380CA", "Coolpad 5891": "5891", "Coolpad 5891S": "5891S", "Coolpad 5951": "5951", "Coolpad 7061": "7061", "Coolpad 7230S": "7230S", "Coolpad 7232": "7232", "Coolpad 7251": "7251", "Coolpad 7270": "7270", "Idea ULTRA Pro": "7270I", "Coolpad 7275": "7275", "Coolpad 7295+": "7295A", "Coolpad 7295A": "7295A", "Coolpad 7296": "7296", "Coolpad 7620L": "7620L", "Coolpad 8079": "8079", "Coolpad 8122": "8122", "Coolpad 8198W": "8198W", "Coolpad 8297D": "8297D", "Coolpad 8297L-I00": "8297L-I00", "CP8298_M02": "8298-M02", "CP8676_I03": "8676-I03", "Coolpad 8712": "8712SV", "Coolpad 8718": "8718", "Coolpad 8722": "8722", "Coolpad E570": "8722_S00", "Coolpad 8722V": "8722V", "Coolpad 8729": "8729", "Coolpad 8730L": "8730L", "Coolpad 8736": "8736", "Coolpad 8737A": "8737A", "Coolpad 8970L": "8970L", "Coolpad 8971": "8971", "Coolpad 9150W": "9150W", "Coolpad 9190_T00": "9190_T00", "Coolpad 9970L": "9970L", "Coolpad 9976A": "9976A", "Coolpad A8": "A8", "Coolpad A8-831": "A8-831", "Coolpad A8-930": "A8-930", "Coolpad A8-931": "A8-931", "Coolpad A8-931N": "A8-931", "Coolpad A8-932": "A8-932", "Coolpad B770": "B770", "Coolpad B770S": "B770S", "Bs 501": "Bs501", "Coolpad R116": "C1-S02", "CK3-M1": "CK3-01", "Coolpad CM001": "CM001", "Coolpad 5108": "CP5108", "Coolpad 5210A": "CP5210A", "Coolpad 5310": "CP5310", "5560S": "CP5660S", "Coolpad 5952": "CP5952", "Coolpad 8021": "CP8021", "Coolpad 8089": "CP8089", "Coolpad 8089Q": "CP8089Q", "Coolpad8295M": "CP8295M", "Coolpad 8735": "CP8735", "Coolpad8750": "CP8750", "Coolpad 9190L": "CP9190L", "Coolpad 9250L": "CP9250L", "Coolpad 9970": "CP9970", "Coolpad A520": "CPA520", "Coolpad T1": "CPT1", "C106": "Cool C1", "C106-6": "Cool C1", "C106-7": "Cool C1", "C106-9": "Cool C1", "C107-9": "Cool C1", "coolpad E2": "Coolpad 5370_I00", "C1-U02": "Coolpad C1-U02", "COL-A0": "Coolpad COL-A0", "CVC-A0": "Coolpad CVC-A0", "CVC-M0": "Coolpad CVC-M0", "GRA-M0": "Coolpad GRA-M0", "POL-A0": "Coolpad POL-A0", "VCR-I0": "Coolpad VCR-I0", "Coolpad_5218D": "Coolpad5218D", "Coolpad 5315": "Coolpad5315", "Coolpad 5872": "Coolpad5872", "Coolpad 5879T": "Coolpad5879T", "Coolpad 5891Q": "Coolpad5891Q", "Coolpad 5892": "Coolpad5892", "Coolpad 5950": "Coolpad5950", "Coolpad 5950T": "Coolpad5950T", "Coolpad 7270_W00": "Coolpad7270_W00", "Coolpad 7295C": "Coolpad7295C", "Coolpad 7295C_C00": "Coolpad7295C_C00", "Spice Mi-515": "Coolpad7295I", "Coolpad 7295T": "Coolpad7295T", "Coolpad 7296S": "Coolpad7296S", "Coolpad 7298A": "Coolpad7298A", "Coolpad 7298D": "Coolpad7298D", "Coolpad 7320": "Coolpad7320", "801ES": "Coolpad801ES", "Coolpad 8297W": "Coolpad8297W", "Coolpad 8705": "Coolpad8705", "Coolpad 8720L": "Coolpad8720L", "Coolpad E561": "E561", "Coolpad Flo": "Flo", "Coolpad E580": "K2L_S00", "Coolpad R106": "R106", "Coolpad R108": "R108", "Coolpad E561_EU": "SK3-U00", "ivvi SS1-03": "SS1-03", "ivvi SS2-01": "SS2-01", "Vodafone Smart 4": "VodafoneSmart4", "Vodafone Smart 4 turbo": "VodafoneSmart4turbo", "Coolpad Y72-921": "Y72-921", "Coolpad E571": "Y72-921", "Coolpad Y803-8": "Y803-8", "Coolpad Y803-9": "Y803-9", "Coolpad Y83-900": "Y83-900", "Coolpad Y83-I00": "Y83-I00", "Coolpad E502": "Y83_U00", "Coolpad Y90": "Y90", "Coolpad Y891": "Y91-921", "Coolpad Y91-921": "Y91-921", "Coolpad Y92-9": "Y92-9", "Coolpad 7236": "cp7236", "ivvi i1": "i1", "ivvi i1-01": "i1-01", "ivvi i3-M1": "i3-M1", "TN800A1": "TurboTab E1", "g06": "g06+", "ACTION-X3": "Action-X3", "Action-X3 Pro": "Action-X3", "Core-X3": "Core- X3", "TREKKER-X3": "TREKKER- X3", "Trekker-M1": "L635E_1", "Android Tablet FT7": "FT7", "CUBOT R9": "CUBOT MAGIC", "CUBOT J3 PRO": "CUBOT_J3_PRO", "CUBOT DINOSAUR": "DINOSAUR", "CUBOT ECHO": "ECHO", "CUBOT_MANITO": "MANITO", "CUBOT MAX": "MAX", "CUBOT CHEETAH 2": "NOTE S", "CUBOT_NOTE_S": "NOTE S", "RAINBOW": "WIKO", "SURF1000": "ACCENT SURF 1000", "Speed-Y2": "Accent Speed Y2", "Speed-Y3": "Accent Speed Y3", "FAST7_4G": "FAST7 4G", "PEARL_A2": "Pearl A2", "Speed-X2": "Speed X2", "B145": "DEXP B145", "G150": "DEXP G150", "Ixion M850": "DEXP Ixion M850", "Ixion X150": "DEXP Ixion X150", "DEXP_ES1050": "DEXP Ixion_ES1050", "P170": "DEXP P170", "N169": "DEXP Ursus N169", "P310": "DEXP Ursus P310", "S169": "DEXP Ursus S169", "B160": "DEXP_B160", "XL150": "DNS_DEXP XL150 Project", "P210": "Dexp Ursus P210", "P380": "Dexp Ursus P380", "S170i": "Dexp Ursus S170i", "S270": "Dexp Ursus S270", "Ixion EL450": "EL450", "G155": "ERA", "MS550": "ERA", "Ixion ES355": "ES355", "Ixion ES550": "ES550", "Ixion ES850": "ES850", "ML450": "Ixion ML450", "Ixion M340": "M340", "Ixion M545": "M545", "Ixion M750": "M750", "Ixion ML245": "ML245", "Ixion XL155": "XL155", "Ixion MS255": "lxion MS255", "Tablet DL 3406": "3406", "Tablet DL 3420": "3420", "Tablet_DL_3420": "3420", "Tablet_DL_3903": "3903", "Tablet_DL_3721": "Creative Kids", "Tablet_DL_3723": "Creative Tab", "Tablet_DL_3725": "Creative kids", "Tablet_DL_3920": "DL3920", "Smartphone DL Horizon H8": "Horizon H8", "Tablet_DL_4010": "Horizon Tab T10", "Tablet_DL_2810": "Mobi Tab", "Tablet_DL_2811": "Mobi Tab", "Tablet_DL_3722": "Sabichões", "Tablet_DL_2820": "TabFácil", "Tablet DL 3411": "TabKids Plus", "Tablet DL 3421": "TabPhone 710 pro", "Tablet DL 3410": "X_Quad_Pro", "Smartphone_YZU_DS53": "YZU_DS53", "Tablet_DL_3910": "i-Player_KIDS", "DNA Android TV": "DNA TV-hubi", "DO_S1": "Mate1", "Dslide710": "DSlide 710", "DSlide750": "DSlide 750", "DSlide 1013": "Dslide 1013", "Dslide1013QC_v2": "Dslide 1013QC", "Dslide714_v2": "Dslide 714", "Konnect402": "Konnect 402", "Konnect_502": "Konnect 502", "Konnect_504": "Konnect 504", "Konnect506": "Konnect 506", "Konnect_510_colors": "Konnect 510 colors", "Konnect_560": "Konnect 560 Cinépix", "Konnect_601": "konnect 601", "DATSUN_D5500": "Datsun_D5500", "Dell Chromebook 13 3380": "Chromebook 13 3380", "Dell Chromebook 13 7310": "Chromebook 13 7310", "CS-1A13": "Cloud Connect", "001DL": "Streak", "Dell M01M": "Streak", "Dell Streak": "Streak", "Venue 10 5050": "Venue 10", "Venue 7 3741": "Venue 7", "Venue 7 3740": "Venue 7", "Venue7 3740": "Venue 7", "Venue7 3740 LTE": "Venue 7", "Venue 7 3730": "Venue 7", "Venue 7 HSPA+": "Venue 7", "Venue 10 7040": "Venue 7040", "Venue 8 7840": "Venue 8", "Venue 8 7840 LTE": "Venue 8", "Venue 8 3840": "Venue 8", "Venue8 3840": "Venue 8", "Venue8 3840 LTE": "Venue 8", "Venue 8 3830": "Venue 8", "Venue 8 HSPA+": "Venue 8", "BHT1600": "BHT-1600", "BHT-1700BWB-1-A7": "BHT-1700BWB-A7", "BHT-1700QLWB-P-A7": "BHT-1700QLWB-A7-P", "Compumax_Blue_6030-805-0001": "CompumaxBlue", "DL721-RB": "DL721RB", "PLT7803G": "DL785D", "DL1008M": "MID1008_Digiland", "Digicom Tribe": "Tribe", "DG-D07SGP": "DG-D07S/GP", "Digital2-Deluxe": "Deluxe", "Digital2 Platinum": "Platinum", "Digital2 Plus": "Plus", "DWA1015D": "DWA1015D Tablet", "TR10CD1": "TR10CD1_P", "CITI_1508_4G_CS1114ML": "DIGMA CITI 1508 4G CS1114ML", "CITI 1532 3G CS1144MG": "DIGMA CITI 1532 3G CS1144MG", "CITI_1544_3G_CS1154MG": "DIGMA CITI 1544 3G CS1154MG", "CITI_7507_4G_CS7113PL": "DIGMA CITI 7507 4G CS7113PL", "CITI_7543_3G_CS7153MG": "DIGMA CITI 7543 3G CS7153MG", "CITI_8527_4G_CS8139ML": "DIGMA CITI 8527 4G CS8139ML", "CITI 8531 3G CS8143MG": "DIGMA CITI 8531 3G CS8143MG", "CITI_8542_4G_CS8152ML": "DIGMA CITI 8542 4G CS8152ML", "HIT Q401 3G HT4039PG": "DIGMA HIT Q401 3G HT4039PG", "HIT Q500 3G HT5035PG": "DIGMA HIT Q500 3G HT5035PG", "LINX A453 3G LT4038PG": "DIGMA LINX A453 3G LT4038PG", "LINX B510 3G LT5037MG": "DIGMA LINX B510 3G LT5037MG", "Optima 1026N 3G TT1192PG": "DIGMA Optima 1026N 3G TT1192PG", "Optima 7017N 3G TS7177MG": "DIGMA Optima 7017N 3G TS7177MG", "Optima_Prime_3_3G_TS7131MG": "DIGMA Optima Prime 3 3G TS7131MG", "Optima Prime 4 3G TT7174PG": "DIGMA Optima Prime 4 3G TT7174PG", "Plane_1523_3G_PS1135MG": "DIGMA Plane 1523 3G PS1135MG", "Plane_1524_3G_PS1136MG": "DIGMA Plane 1524 3G PS1136MG", "Plane_1525_3G_PS1137MG": "DIGMA Plane 1525 3G PS1137MG", "Plane_1526_4G_PS1138ML": "DIGMA Plane 1526 4G PS1138ML", "Plane_1537E_3G_PS1149MG": "DIGMA Plane 1537E 3G PS1149MG", "Plane_1538E_4G_PS1150ML": "DIGMA Plane 1538E 3G PS1150ML", "Plane_1541E_4G_PS1157ML": "DIGMA Plane 1541E 4G PS1157ML", "Plane_1550S_3G_PS1163MG": "DIGMA Plane 1550S 3G PS1163MG", "Plane_1551S_4G_PS1164ML": "DIGMA Plane 1551S 4G PS1164ML", "Plane_1553M_4G_PS1166ML": "DIGMA Plane 1553M 4G PS1166ML", "Plane_1559_4G_PS1173PL": "DIGMA Plane 1559 4G PS1173PL", "Plane 1570N 3G PS1185MG": "DIGMA Plane 1570N 3G PS1185MG", "Plane 1713T 3G PT1138MG": "DIGMA Plane 1713T 3G PT1138MG", "Plane 1715T 4G PT1139PL": "DIGMA Plane 1715T 4G PT1139PL", "Plane_7006_4G_PS7041PL": "DIGMA Plane 7006 4G PS7041PL", "Plane_7535E_3G_PS7147MG": "DIGMA Plane 7535E 3G PS7147MG", "Plane 7539E 4G PS7155ML": "DIGMA Plane 7539E 4G PS7155ML", "Plane_7545V_3G_PS7151MG": "DIGMA Plane 7545V 3G PS7151MG", "Plane_7552M_3G_PS7165MG": "DIGMA Plane 7552M 3G PS7165MG", "Plane_7556_3G_PS7170MG": "DIGMA Plane 7556 3G PS7170MG", "Plane_7557_4G_PS7171PL": "DIGMA Plane 7557 4G PS7171PL", "Plane 7574S 4G PS7191PL": "DIGMA Plane 7574S 4G PS7191PL", "Plane_8540E_4G_PS8156ML": "DIGMA Plane 8540E 4G PS8156ML", "Plane_8558_4G_PS8172PL": "DIGMA Plane 8558 4G PS8172PL", "Plane_9634_3G_PS9146MG": "DIGMA Plane 9634 3G PS9146MG", "Plane_9654M_3G_PS9167PG": "DIGMA Plane 9654M 3G PS9167PG", "VOX Flash 4G VS5015ML": "DIGMA VOX Flash 4G VS5015ML", "VOX G450 3G VS4001PG": "DIGMA VOX G450 3G VS4001PG", "VOX_G501_4G_VS5033ML": "DIGMA VOX G501 4G VS5033ML", "VOX_S513_4G_VS5035ML": "DIGMA VOX S513 4G VS5035ML", "LINX A452 3G LT4030PG": "LINX A452 3G", "Plane_7012M_3G_PS7082MG": "Plane 7012M 3G PS7082MG", "Plane_7546S_3G_PS7158PG": "Plane 7546S 3G", "Plane_7547S_3G_PS7159PG": "Plane 7547S 3G", "Plane_8522_3G_PS8135MG": "Plane 8522 3G PS8135MG", "Plane_8536E_3G_PS8148MG": "Plane 8536E 3G PS8148MG", "Plane_8548S_3G_PS8161PG": "Plane_8548S_3G", "Plane_8549S_4G_PS8162PL": "Plane_8549S_4G", "VOX S508 3G VS5031PG": "VOX_S508_3G", "VOX S509 3G VS5032PG": "VOX_S509_3G", "SH960C-DS": "EVOLVE", "Frozen": "BMF00001", "TT01": "Japan", "N-08D": "MEDIAS TAB UL N-08D", "MIX": "Mix", "Shoot_1": "Shoot_ 1", "DOOGEE X10": "X10", "X5max": "X5  MAX", "X5max_PRO": "X5 max pro", "X7pro": "X7Pro", "X9pro": "X9 Pro", "Y6C": "Y6 C", "Shoot_2": "shoot 2", "SL548": "Doppio SL548", "SL505": "Doppio_SL505", "Doro_8020x": "8020x", "Doro 8031": "Liberto 822 / 8030", "Doro 8040": "8040", "Doro 8030": "Liberto 822 / 8030", "Doro 824": "825A", "Doro Liberto 825": "825A", "Doro 8030/8031/8028": "Liberto 822 / 8030", "Doro Liberto 810": "Liberto 810", "Doro Liberto 810-orange": "Liberto 810", "Doro Liberto 820": "Liberto 820", "Doro Liberto 820 Mini": "Liberto 820 Mini", "Doro Liberto 822": "Liberto 822 / 8030", "825_T-Mobile": "Liberto 825", "Y88X_A": "Y88X Plus", "Y88X_PLUS": "Y88X Plus", "dtacPhoneM2": "Phone M2", "dtac_Phone_S2": "Phone S2", "dtacPhoneS3": "Phone S3", "dtacPhoneT2": "Phone T2", "dtacPhoneX3": "Phone X3", "Smarty_II": "Smarty II", "Eclipse_G400M": "Eclipse G400M", "Eclipse_G500M": "Eclipse G500M", "TF10EA2_P61": "TF10EA2", "TF10EA2_P8": "TF10EA2", "ELT0801": "EPIK Learning Tab 8\\'\\'", "ELT0702": "EPIK Learning Tab Jr.", "ELT0703": "EPIK_ELT0703", "ECHO_HORIZON_LITE": "HORIZON LITE", "MOON": "Moon", "MotionE11": "Motion E1.1", "Verssed VP1": "Platiunm vp.1", "Verssed VP2": "Platiunm vp.2", "VERSSED vp2.1": "VERSSED platinum vp.2.1", "VERSSED vp3": "Verssed Platinum VP3.0", "X4UPlus": "X4U+", "TU43GDX": "USA & CANADA", "P8_3D": "P8 3D", "P8_Max": "P8 Max", "SproutChannelCubby": "Sprout Channel Cubby", "Ematic EGD170": "EGD170", "EGS109": "EMATICEGS109", "FunTab2": "FunTab 2", "FunTabPlay": "FunTab 3", "Funtab3": "FunTab 3", "GTB103M": "GTB103B", "PBSKD12": "PBS Kids PlayPad", "AGT418": "USA", "em_i8180": "EM_I8180", "EM749_748": "EM749/748", "f400": "F400", "Gem Box F500": "Gaming Android Gem Box", "HARDCASEH550S": "H550S", "P550S": "PowerMaxP550S", "Energy Tablet Pro 4": "adelroth", "Cynus T2": "CINK KING", "IMD501": "CINK KING", "freebit PandA": "CINK KING", "Fly_IQ442": "CINK SLIM", "WIKO-CINK SLIM": "CINK SLIM", "CT1010": "Carrefour CT1010", "Cinema": "DARKSIDE", "X40E": "Lazer X40E", "A930": "MG", "CINK PEAX": "WIKO CINK PEAX", "EverClassic": "WIKO CINK PEAX", "CINKPLUS": "WIKO CINK+", "SUBLIM": "WIKO SUBLIM", "CINK FIVE": "Wiko CINK FIVE", "Cynus T5": "Wiko CINK FIVE", "NGM Orion": "orion", "NGM Vanity Smart": "vanitysmart", "OWN-I62S": "OWN I62S", "ERGO B500 First": "ERGO B500", "B501": "ERGO B501", "Essentielb-Black Diamond": "Black Diamond", "Essentielb-Pixis": "Pyxis", "ST7001": "ST7001 Tablet", "Smart\\'Tab_7800": "Smart\\'TAB 7800", "eSTAR BEAUTY 2 HD Quad core": "BEAUTY 2 HD Quad core", "eSTAR GO HD Quad core 3G": "GO! HD Quad core 3G", "eSTAR GO! IPS Quad core 3G": "GO! IPS Quad core 3G", "eSTAR GRAND HD Quad core": "eSTAR GRAND HD Quad Core", "eSTAR Grand IPS Quad core 3G": "Grand IPS Quad core 3G", "EuroleaguePhone": "I7a", "EVERCOSS A65": "One X", "EVERTEK V4": "V4", "EVIANT_EVT10Q": "EVC10Q", "Evolio_M5Pro": "M5Pro", "Evolio_M6": "M6", "Evolio_M8": "M8", "StrongPhoneQ9": "StrongPhone Q9", "Fresh_NF": "Fresh", "Imperium7": "Imperium 7", "Imperium8": "Imperium 8", "Joy_TV": "Joy TV", "Light": "V9", "M1_Plus": "M1 Plus", "Onliner4": "Onliner 4", "RioPlay": "Rio Play", "Surfer7773G": "Surfer777 3G", "TabMini": "Tab Mini", "Tornado3G": "Tornado 3G", "Winner7": "Winner 7", "Winner8": "Winner 8", "ROCK_X11": "Rock_X11", "F80s_plus": "F2 F80s_plus", "LT5216": "F2_LT5216", "TDA02": "M24IS810", "FPT_X10": "FPT X10", "FPT_X9": "FPT X9", "FPT X50": "X50", "FV-FG6": "OC1020A", "M200H": "FANTEC M200H", "FAN-M300H": "FANTEC M300H", "Smart509": "Smart 509", "Smart550": "Smart 550", "Royale Y2": "FERO ROYALE Y2", "Power 3": "POWER 3", "Royale_X2": "Royale X2", "Fone": "FIGI Fone", "Ftwo": "FIGI Ftwo", "Gone": "FIGI Gone", "SP5045V": "FNB", "ba101": "BandOTT", "ba201": "BANDOTT Sandwich", "F_Plus": "F Plus", "S504050": "Fluo", "5S": "5_S", "FS529": "Champ", "FS517": "Cirrus 11", "FS516": "Cirrus 12", "FS518": "Cirrus 13", "FS522": "Cirrus 14", "FS523": "Cirrus 16", "FS525": "Cirrus 17", "FS504": "Cirrus 2", "FS506": "Cirrus 3", "FS507": "Cirrus 4", "FS508": "Cirrus 6", "FS511": "Cirrus 7", "FS514": "Cirrus 8", "FS553": "Cirrus 9", "IQ4507": "Dune 3", "Fly IQ4508": "Dune 4", "IQ4407": "ERA Nano 7", "Fly IQ4405_Quad": "EVO Chic 1", "Fly Ego Art 2": "Ego Art 2", "IQ4502 Quad": "Era Energy 1", "IQ456": "Era Life 2", "IQ4406": "Era Nano 6", "IQ4400": "Era Nano 8", "IQ436i": "Era Nano 9", "IQ4415 Quad": "Era Style 3", "IQ459": "Evo Chic 2", "IQ459 Quad": "Evo Chic 2", "IQ4414 Quad": "Evo Tech 3", "Flylife Connect 10.1 3G 2": "Flylife Connect 10.1", "IQ4413_Quad": "IQ4413 Quad", "Fly IQ4418 AF": "IQ4418", "FLY IQ4503": "IQ4503", "Fly IQ4505": "IQ4505", "Fly IQ4514": "IQ4514 Quad", "Fly IQ4514 AF": "IQ4514 Quad", "IQ4516": "IQ4516 Octa", "IQ458 Quad": "IQ458 Quad Evo Tech 2", "Fly IQ4602": "IQ4602", "IQ4602 Quad": "IQ4602", "FLY_IQ4400_AF": "Iris", "FS524": "Knockout", "Compact": "Life Compact", "Mega": "Life Mega", "Vista": "Life Vista", "FS528": "Memory Plus", "FS512": "Nimbus 10", "FS455": "Nimbus 11", "FS510": "Nimbus 12", "FS456": "Nimbus 14", "FS457": "Nimbus 15", "FS459": "Nimbus 16", "FS527": "Nimbus 17", "FS452": "Nimbus 2", "FS551": "Nimbus 4", "FS505": "Nimbus 7", "FS454": "Nimbus 8", "FS501": "Nimbus3", "FS521": "Power Plus 1", "FS526": "Power Plus 2", "FS554": "Power Plus FHD", "FS530": "Power Plus XXL", "FS520": "Selfie 1", "FS407": "Stratus", "FS401": "Stratus 1", "FS404": "Stratus 3", "FS405": "Stratus 4", "FS406": "Stratus 5", "FS458": "Stratus 7", "FS408": "Stratus 8", "FS409": "Stratus 9", "FLY IQ4511": "Tornado One", "IQ4511 Octa": "Tornado One", "IQ4511 TR": "Tornado One", "Bradshaw": "Q Wander / Q Marshal / Q Founder 2.0 / Bradshaw / Dylan", "Q Marshal": "Q Wander / Q Marshal / Q Founder 2.0 / Bradshaw / Dylan", "Q Wander": "Q Wander / Q Marshal / Q Founder 2.0 / Bradshaw / Dylan", "Alberto": "Wear", "EA Connected": "Wear", "Grayson": "Wear", "AX Connected": "Wear", "Vapor 2": "Wear", "Vapor": "Wear OS", "Q Venture HR": "Wear", "Riley Touch": "Wear", "Riley Touchscreen": "Wear", "Sofie": "Wear", "CSL_Spice_MI700": "CSL Spice MI700", "Spice_MI700": "CSL Spice MI700", "Commtiva-N700": "Commtiva N700", "IN260": "InFocus IN260", "COUPLE": "MUSN COUPLE", "SH837W": "SHARP SH837W", "SHP-SH630E": "SHARP SH630E", "SH631W": "SHARP SH631W", "X900": "XOLO", "VP700": "vizio VP700", "VP800": "vizio VP800", "TONE m15": "Tone m15", "Freebox Player Mini": "Mini 4K", "Freebox Player Mini v2": "Mini 4K", "FTU18A00": "Cricket Wave", "FTE161E": "Ice 2", "FTE161G": "ICE2plus", "FTE171A": "ICE3", "FTJ17B00": "Miyabi 2 Dual", "FTJ17C00": "Priori 5", "FT162D": "Priori4", "FTJ162D": "Priori4", "FTJ162E": "RAIJIN", "FTJ161B": "FREETEL Samurai Rei", "FTJ17A00": "SAMURAI REI 2", "101F": "ARROWS A SoftBank 101F", "201F": "ARROWS A SoftBank 201F", "202F": "ARROWS A SoftBank 202F", "301F": "ARROWS A SoftBank 301F", "IS12F": "ARROWS ES IS12F", "F-03D": "ARROWS Kiss F-03D", "F-03E": "ARROWS Kiss F-03E", "M01": "ARROWS M01", "M305": "ARROWS M305", "M357": "ARROWS M357", "M555": "ARROWS M555", "F-11D": "ARROWS Me F-11D", "F-06E": "ARROWS NX F-06E", "EM01F": "ARROWS S EM01F", "F-05E": "ARROWS Tab F-05E", "FJT21": "ARROWS Tab FJT21", "F-01D": "ARROWS Tab LTE F-01D", "FAR70B": "ARROWS Tab Wi-Fi FAR70B", "FAR7": "ARROWS Tab Wi-Fi FAR75A/70A", "F-04E": "ARROWS V F-04E", "F-02E": "ARROWS X F-02E", "F-10D": "ARROWS X F-10D", "F-05D": "ARROWS X LTE F-05D", "FJL22": "ARROWS Z FJL22", "ISW11F": "ARROWS Z ISW11F", "ISW13F": "ARROWS Z ISW13F", "FJL21": "ARROWS ef FJL21", "F-074": "ARROWS mu F-07D", "F-07D": "ARROWS mu F-07D", "FJJB091": "ARROWS mu F-07D", "F-07E": "Disney Mobile on docomo F-07E", "F-08D": "Disney Mobile on docomo F-08D", "F-09D": "F-09D ANTEPRIMA", "Patio100_3G": "Patio100", "IS11T": "REGZA Phone IS11T", "IS04": "REGZA Phone T-01C", "T-01C": "REGZA Phone T-01C", "T-01D": "REGZA Phone T-01D", "T-02D": "REGZA Phone T-02D", "F-12D": "Raku-Raku SMART PHONE F-12D", "F-08E": "Raku-Raku SMART PHONE2 F-08E", "M350": "STYLISTIC M350/CA2", "M532": "STYLISTIC M532", "M702": "STYLISTIC M702", "MH350": "STYLISTIC MH350", "S01-orange": "STYLISTIC S01", "TONE-m17": "TONE m17", "F-05J": "arrows Be F-05J", "M02": "arrows M02", "arrowsM03": "arrows M03", "arrowsM04": "arrows M04", "arrowsM04-PREMIUM": "arrows M04 PREMIUM", "M01T": "arrows Tab M01T", "Fusion5_F104B": "Fusion5", "W104Plus": "Fusion5", "176HS1050232": "B-52", "FMT-NM7108-01": "DRONE", "FMT-NT8A42-01": "Dual 8", "175WT1050231": "Eagle", "176HS1050531": "Falcon", "FMT-NM7058-02": "Flash", "16M4HI105024": "Netsurfer STORM", "16M5HI105023": "Netsurfer TYPHOON", "175HS1050231": "Tomcat", "175FT1050241": "Viper", "FMT-NM7116-01": "netsurferDUAL 7", "G-TiDE FANS7": "FANS7", "GIGI_U1": "U1", "Akta_A4": "Akta A4", "GSmart Aku A1": "Aku A1", "GSmart Alto A2": "Alto A2", "GSmart Arty A3": "Arty A3", "GSmart GS202+": "GS202+", "GSmart Guru G1": "Guru G1", "GSmart Maya M1": "Maya M1", "GSmart Maya M1 v2": "Maya M1 v2", "GSmart Mika M2": "Mika M2", "GSmart Mika M3": "Mika M3", "GSmart Rey R3": "Rey R3", "GSmart Rio R1": "Rio R1", "GSmart Roma R2": "Roma R2", "GSmart SX1": "SX1", "GSmart Saga S3": "Saga_S3", "GSmart Sierra S1": "Sierra S1", "GSmart T4": "T4", "GSmart Tuku T2": "Tuku T2", "GALAPAD_S6": "Galapad S6", "Garminfone": "Nuvifone", "nuvifone A50": "Nuvifone", "n\\xc3\\xbcvifone A50": "Nuvifone", "SENSE901": "Retailer Stores", "General Mobile 4G": "4G", "General Mobile 4G Dual": "4G Dual", "GM 5": "5", "e-tab4": "E-tab 4", "GM 6": "GM 6 s", "GM6": "GM 6 s", "GM 5 Plus": "GM5 Plus Turkcell", "GM 5 Plus d": "GM5 Plus d", "GM 8 d": "GM8", "GM 8": "GM8", "GM8 go": "GM8 Go", "GM 5 d": "General Mobile 5 d", "ATV495MAX": "EnjoyTV", "ATV598MAX": "Enjoytv_hybrid", "CP600": "Tough Mobile", "mx50": "MX50", "Getac Z710": "Z710", "zx70": "ZX70", "GHIA_ZEUS_3G": "ZEUS 3G", "EL-20-3050": "EL-20-3710", "GSmart G1317D": "GSmart G1317", "9DTB7": "Hipstreet 9DTB7 / Lazer MY9308P", "MY9308P": "Hipstreet 9DTB7 / Lazer MY9308P", "P102G": "P102g", "INHON PAPILIO G1": "PAPILIO G1", "GS-1008": "PROSCAN PLT1066 / MAG MAGPAD / TEAC TEACTAB / DOPO GS-1008", "MAGPAD": "PROSCAN PLT1066 / MAG MAGPAD / TEAC TEACTAB / DOPO GS-1008", "PLT1066": "PROSCAN PLT1066 / MAG MAGPAD / TEAC TEACTAB / DOPO GS-1008", "TEACTAB": "PROSCAN PLT1066 / MAG MAGPAD / TEAC TEACTAB / DOPO GS-1008", "SB510": "SB510 / IBT-102", "Gigabyte TB100": "TB100", "Aero1021/P1021HCBA4C1VXX": "TM105A", "Glacier": "TM105A", "Qrypton1010": "TM105A", "GSmart7Tab": "TM75A", "Qrypton7": "TM75A", "Voyager": "TM75A", "iliumPAD": "mexico", "Gigaset GS160": "GS160", "Gigaset GS170": "GS170", "GS270": "Gigaset GS270", "GS270 plus": "Gigaset GS270 plus", "GS370": "Gigaset GS370", "GS370_Plus": "Gigaset GS370_Plus", "Maxwell-10": "Gigaset Maxwell 10", "GS55-6": "ME", "GS57-6": "ME Pro", "GS53-6": "ME Pure", "80-1": "Maxwell-10", "Gigaset QV1030": "QV1030", "Gigaset QV830": "QV830", "Gigaset QV831": "QV831", "s5Pro": "Gini s5Pro", "e6": "e6_plus", "Gini n8": "n8", "Ginzzu GT-1050": "GT-1050", "Ginzzu GT-7115": "GT-7115", "Ginzzu GT-7210": "GT-7210", "Ginzzu GT-8110": "GT-8110", "GIONEE A1": "A1", "A1 lite": "A1 Lite", "GN9008": "E8", "GIONEE F109L": "F109L", "GIONEE F109N": "F109N", "GIONEE F205": "F205", "GIONEE F6": "F6", "GIONEE F6L": "F6L", "V6L": "ForwardZero", "GN5005L": "GN5005", "GiONEE S7": "GN9006", "M5_lite": "M5 Lite", "GN8003": "M6", "M6 lite": "M6 Lite", "GN8002": "M6 Plus", "GN8002S": "M6 Plus", "GIONEE M7": "M7", "GIONEE M7Plus": "M7Plus", "P5": "P5L", "GIONEE P7": "P7", "S_plus": "S plus", "GIONEE S10": "S10", "GIONEE S10 lite": "S10 lite", "GIONEE S10B": "S10B", "GIONEE S10BL": "S10BL", "GIONEE S10C": "S10C", "GIONEE S10CL": "S10CL", "GIONEE S10L": "S10L", "GIONEE S11": "S11", "GIONEE S11 lite": "S11 lite", "GIONEE S11L": "S11L", "GN9005": "S5.1", "GN9010": "S6", "GN9012": "S6Pro", "GN9011": "S8", "GIONEE W919": "W919", "GIONEE X1": "X1", "GO Onyx LTE": "GO Onyx", "Go Onyx HD": "GO Onyx HD", "INSIGNIA_550i": "INSIGNIA 550i", "QUANTUM_1010N": "QUANTUM 1010N", "QUANTUM_400_LITE": "QUANTUM 400 LITE", "QUANTUM_700S": "QUANTUM_700S/QUANTUM 700S", "Quantum_500_STEEL": "Quantum 500 STEEL", "TQ700": "TQ700/QUANTUM 700/TAB", "View Prime": "g08", "coral": "Chromebook", "Chromebook 14 (CB3-431)": "Chromebook", "Lenovo N23 Yoga/Flex 11 Chromebook": "Chromebook", "Mediatek MTK8173 Chromebook": "Chromebook", "RK3288 Chrome OS Device": "Chromebook", "Rockchip RK3288 Chromebook": "Chromebook", "ASUS Chromebook C213NA": "Chromebook", "Intel Apollo Lake Chromebook": "Chromebook", "reef": "Chromebook", "Braswell Chrome OS Device": "Lenovo N Series Chromebook", "Intel Braswell Chromebook": "Chromebook", "Google Chromebook Pixel (2015)": "Chromebook Pixel (2015)", "fizz": "Chromebox", "Android SDK built for x86": "Emulator", "GT-I9505G": "Galaxy S4 Google Play Edition", "Google Pixelbook": "Pixelbook", "Yellowstone": "Project Tango Tablet Development Kit", "GPLUS F53": "F53", "GPLUS_FW6950": "FW6950", "GPLUS_S9701": "S9701", "Great Wall T709": "T709GW", "TA10CA2": "NBX-T1014N", "GTB 1050": "GTB1050", "GTB 850": "GTB850", "GTB 801": "TC69CA2", "A7100_X3": "A7100 X3", "A714_Vivo_Play": "A714 Vivo Play", "A716_Inspire_Life": "A716 Inspire Life", "A726_Infinity_Lite": "A726 Infinity Lite", "Gtel X5": "X5", "Gtel X5plus": "X5plus", "GUESS Connect": "Wear", "A79": "A79 Tablet", "S9_Plus": "S9 Plus", "HP 10": "10", "HP 10 Plus": "10 Plus", "HP 7 G2": "7 G2", "HP 7 Plus": "7 Plus", "HP 7 Plus G2": "7 Plus G2", "HP 7": "7 Tablet", "HP 7 VoiceTab": "7 VoiceTab", "HP 7.1": "7.1", "HP 8": "8", "HP 8 G2": "8 G2", "HP Slate 10 HD": "Slate 7 HD", "soraka": "Chromebook x2", "HP Chromebook x360 11 G1 EE": "Chromebook x360 11 G1 EE", "HP Chromebook 11 G5 / HP Chromebook 11-vxxx": "HP Chromebook 11 G5 / 11-vxxx", "HP Pro 8 Tablet with Voice": "Pro 8 Tablet with Voice", "HP Pro Slate 10 EE G1": "Pro Slate 10 EE G1", "HP Pro Slate 12": "Pro Slate 12", "HP Pro Slate 8": "Pro Slate 8", "HP Slate 10 Plus": "Slate 10 Plus", "HP Slate 17": "Slate 17", "HP Slate 6 Voice Tab": "Slate 6 Voice Tab", "HP Slate 6 Voice Tab II": "Slate 6 Voice Tab II", "HP Slate 6 VoiceTab Plus": "Slate 6 VoiceTab Plus", "HP Slate 7": "Slate 7", "HP Slate 7 Beats Special Edition": "Slate 7 Beats Special Edition", "HP Slate7 Beats Special Edition": "Slate 7 Beats Special Edition", "HP Slate7 Extreme": "Slate 7 Extreme", "HP Slate 7 HD": "Slate 7 HD", "HP Slate 7 Voice Tab": "Voice Tab 7", "HP Slate 7 VoiceTab Ultra": "Slate 7 VoiceTab Ultra", "HP Slate 8 Plus": "Slate 8 Plus", "HP Slate 8 Pro": "Slate8 Pro", "Slate 21": "Slate21", "HP Slate 7 Plus": "Slate7 Plus", "HP SlateBook 10 x2 PC": "SlateBook 10 x2 PC", "HP SlateBook 14 PC": "SlateBook 14", "HP_10_Tablet": "Tablet 10", "HTC One X9 dual sim": "One X9 dual sim", "ADR6325": "\\tADR6325", "HTC_0P3P5": "0P3P5", "HTC_0P4E2": "Desire 601", "HTC 0P9C8": "0P9C8", "HTC Desire 816 dual sim": "Desire 816 dual sim", "HTC_0PFJ50": "0PFJ50", "HTC 0PK72": "0PK72", "HTC One M9PLUS": "One M9PLUS", "HTC 10": "M10", "HTC 10 Lifestyle": "10", "HTC 2PS63": "10", "HTC M10u": "10", "HTC 2PS6200": "10", "HTC M10h": "10", "HTC_M10h": "10", "HTV32": "10", "2PS64": "10", "HTC6545LVW": "10", "MSM8996 for arm64": "10", "HTC 10 evo": "10 evo", "HTC_M10f": "10 evo", "HTC Desire 500 dual sim": "Desire 500 dual sim", "HTC 601e": "601e", "HTC 606w": "Desire 606w", "HTC Desire 600": "Desire 600", "HTC Desire 600 dual sim": "Desire 600 Dual SIM", "HTC PO49120": "606w", "HTC 608t": "desire 608t", "HTC 609d": "Desire 609d", "HTC 6160": "6160", "HTC 619d": "619d", "HTC_7060": "Desire 7060", "HTC 802d": "One", "HTC 803e": "803e", "HTC 8060": "8060", "HTC 8088": "8088", "HTC 809d": "809d", "HTC 8160": "8160", "HTC 901e": "9060", "HTC 801e": "One", "HTC 802w": "One", "HTC 9088": "9088", "HTC 919d": "HTC909d", "HTC_A510c": "A510c", "HTC EVARE_UL": "AT&T HTC One X+", "HTC One X+": "One X+", "HTC Amaze 4G": "Amaze_4G", "HTC Ruby": "Amaze_4G", "HTC_Amaze_4G": "Amaze_4G", "HTC Aria": "Aria", "HTC Aria A6380": "Aria", "HTC Gratia A6380": "Aria", "HTC Liberty": "Aria", "HTC Butterfly": "Butterfly", "HTC DLX_U": "Butterfly", "HTC X920e": "Butterfly", "HTC DLXUB1": "Butterfly", "HTC Butterfly 2": "Butterfly 2", "HTC_B810x": "Butterfly 2", "HTC_B830x": "Butterfly 3", "HTC Butterfly s": "Butterfly S", "HTC_Butterfly_s_901s": "Butterfly S", "HTC 9060": "Butterfly s 9060", "HTC ChaCha A810b": "Chacha", "HTC ChaCha A810e": "Chacha", "HTC ChaChaCha A810e": "Chacha", "HTC Status": "Chacha", "HTC D10w": "D10w", "HTC D316d": "D316d", "HTC D610t": "D610t", "HTC D626t": "D626t", "HTC Desire 626 dual sim": "Desire 626 dual sim", "HTC_D626q": "D626q", "HTC_D628u": "D628u", "HTC D728w": "D728w", "HTC Desire 728 dual sim": "Desire 728 dual sim", "HTC_D728x": "D728x", "HTC D816d": "D816d", "HTC_D816d": "D816d", "HTC D816e": "D816e", "HTC D816h": "Desire 816G dual sim", "HTC D816t": "D816t", "HTC D816v": "D816v", "HTC D816w": "D816w", "HTC D820mt": "Desire D820mini", "HTC_D820f": "D820f", "HTC D820t": "D820t", "HTC D820u": "D820u", "HTC_D820u": "D820u", "HTC_D820ts": "D820ys", "HTC_D820ys": "D820ys", "HTC D826t": "Desire 826 4G 移動公開版(双卡双待)", "HTC6435LRA": "Droid DNA", "ADR6410LRA": "DROID Incredible 4G LTE", "ADR6410LVW": "DROID Incredible 4G LTE", "ADR6410OM": "DROID Incredible 4G LTE", "HTC Desire": "Desire", "X06HT": "Desire", "PB99400": "Desire", "HTC 2PZS1": "Desire 10 compact", "HTC Desire 10 compact": "Desire 10 compact", "a37dj dugl": "Desire 10 compact", "HTC Desire 10 lifestyle": "Desire 10 lifestyle", "HTC_D10u": "Desire 10 lifestyle", "HTC Desire 10 pro": "Desire 10 pro", "HTC_D10i": "Desire 10 pro", "HTC 2PYA3": "Desire 10 pro", "HTC 2Q5V1": "breeze", "HTC Desire 12": "breeze", "HTC 2Q5V200": "Desire 12", "HTC Desire 12 (2Q5V200)": "Desire 12", "HTC 2Q5W1": "Desire 12+", "HTC 2Q5W2": "Desire 12+", "HTC Desire 12+": "Desire 12+", "HTC ZQ5W10000": "Desire 12+", "HTC Desire 200": "Desire 200", "HTC_Desire_200": "Desire 200", "HTC Desire 210 dual sim": "Desire 210 dual sim", "HTC 301e": "Desire 300", "HTC Desire 300": "Desire 300", "HTC_0P6A1": "Desire 300", "HTC_Desire_300": "Desire 300", "HTC D310w": "Desire 310", "HTC Desire 310 dual sim": "Desire 310", "HTC Desire 310": "Desire 310", "HTC_D310n": "Desire 310", "HTC_V1": "Desire 310", "HTC 0PF11": "Desire 320", "HTC 0PF120": "Desire 320", "HTC Desire 320": "Desire 320", "HTC 2PNT1": "Desire 326G dual sim", "HTC Desire 326G dual sim": "Desire 326G dual sim", "HTC Desire 500": "Desire 500", "HTC_Desire_500": "Desire 500", "HTC 5060": "Desire 500 dual sim", "HTC Desire 501": "Desire 501", "HTC_603h": "Desire 501", "HTC Desire 501 dual sim": "Desire 501 dual sim", "HTC 5088": "Desire 5088", "0PCV1": "Desire 510", "HTC 0PCV20": "Desire 510", "HTC Desire 510": "Desire 510", "HTC_0PCV2": "Desire 510", "HTC Desire 512": "Desire 512", "HTC D516d": "Desire 516", "HTC D516t": "Desire 516", "HTC C2": "Desire 516", "HTC D516w": "Desire 516", "HTC V2": "Desire 516 dual sim", "HTC Desire 516 dual sim": "Desire 516 dual sim", "HTC 0PGQ1": "Desire 520", "HTC 0PM31": "Desire 526", "HTC Desire 526": "Desire 526", "HTCD100LVW": "Desire 526", "HTCD100LVWPP": "Desire 526", "HTC 0PL41": "Desire 526GPLUS", "HTC 0PL4100": "Desire 526G+ dual sim", "HTC Desire 526G dual sim": "Desire 526G+ dual sim", "HTC Desire 526GPLUS dual sim": "Desire 526G+ dual sim", "HTC_D526h": "Desire 526G+ dual sim", "HTC Desire 526G": "Desire 526GPLUS", "HTC 2PST1": "Desrie D530", "HTC 2PST2": "Desire 530", "HTC Desire 530": "Desrie D530", "HTC_D530u": "Desire 530", "HTC 2PST3": "Desire 530", "HTCD160LVW": "Desire 530", "HTCD160LVWPP": "Desire 530", "HTC Desire 550": "Desire 550/ 555", "HTC Desire 555": "Desire 550/ 555", "HTC Desire 600c dual sim": "Desire 600c Dual SIM", "HTC Desire 601": "Desire 601", "HTC0P4E1": "Desire 601", "HTC Desire 601 dual sim": "Desire 601 dual sim", "HTC Desire 610": "desire 610", "HTC_0P9O2": "Desire 610", "HTC_D610x": "Desire 610", "HTC 0P9O30": "Desire 612", "HTC Desire 612": "Desire 612", "HTC D616w": "Desire 616 dual sim", "HTC Desire 616 dual sim": "Desire 616 dual sim", "HTC V3": "Desire 616 dual sim", "HTC 0PE64": "Desire 620", "HTC Desire 620": "Desire 620", "HTC_D620u": "Desire 620 dual sim", "HTC 0PE65": "Desire 620G dual sim", "HTC Desire 620G dual sim": "Desire 620G dual sim", "HTC_D620h": "Desire 620G dual sim", "HTC D626d": "Desire 626", "HTCD200LVW": "Desire 626", "HTCD200LVWPP": "Desire 626", "HTC Desire 626": "Desire626s", "HTC_D626x": "Desire 626", "HTC_D630x": "Desire 626", "HTC_0PKX2": "Desire 626", "HTC 0PM11": "Desire 626G+ dual sim", "HTC Desire 626G dual sim": "Desire 626G+ dual sim", "HTC Desire 626GPLUS dual sim": "Desire 626G+ dual sim", "HTC_D626ph": "Desire 626G+ dual sim", "HTC Desire 625": "Desire 626s", "HTC Desire 626s": "Desire 626s", "0PM92": "Desire 626s", "HTC 0PM92": "Desire 626s", "HTC Desire 628": "Desire 628", "HTC Desire 628 dual sim": "Desire 628 dual sim", "HTC 2PST5": "Desire 630 dual sim", "HTC Desire 630 dual sim": "Desire 630 dual sim", "HTC 2PYR1": "Desire 650", "HTC Desire 650": "Desire 650", "HTC_D650h": "Desire 650", "A37 DUGL": "Desire 650 dual sim", "HTC Desire 650 dual sim": "Desire 650 dual sim", "HTC Desire 700 dual sim": "Desire 700 dual sim", "HTC_709d": "Desire 700 dual sim", "HTC 7088": "Desire 7088", "HTC 709d": "Desire 709d", "HTC 2PQ84": "Desire 728", "HTC Desire 728": "Desire 728", "HTC 2PQ83": "Desire 728G dual sim", "HTC Desire 728G dual sim": "Desire 728G dual sim", "HTC Desire 816": "Desire 816", "HTC_0P9C2": "Desire 816", "HTC_D816x": "Desire 816", "HTC Desire 816G dual sim": "Desire 816G dual sim", "HTC 0PFJ4": "Desire 820", "HTC Desire 820": "Desire 820", "HTC Desire 820 dual sim": "Desire 820 dual sim", "HTC Desire 820G PLUS dual sim": "Desire 820G PLUS dual sim", "HTC Desire 820G dual sim": "Desire 820G PLUS dual sim", "HTC_D820pi": "Desire 820G PLUS dual sim", "HTC Desire 820q dual sim": "Desire 820q dual sim", "HTC D820ts": "Desire 820s", "HTC D820us": "Desire 820s", "HTC Desire 820s dual sim": "Desire 820s dual sim", "HTC 2PUK2": "Desire 825", "HTC Desire 825": "Desire 825", "HTC_D825u": "Desire 825", "HTC 2PUK1": "Desire 825 dual sim", "HTC Desire 825 dual sim": "Desire 825 dual sim", "HTC D826w": "Desire 826", "HTC D826d": "Desire D826", "HTC_D826y": "Desire 826", "HTC Desire 826 dual sim": "Desire 826 dual sim", "HTC D828w": "Desire 828", "HTC_D828x": "Desire 828", "HTC 2PRE4": "Desire 828", "HTC Desire 828": "Desire 828", "HTC_D828g": "Desire 828", "HTC Desire 828 dual sim": "Desire 828 dual sim", "HTC 2PRE2": "Desire 828 dual sim", "HTC Desire 830": "Desire 830", "HTC_D830x": "Desire 830", "HTC 2PVD1": "Desire 830 dual sim", "HTC D830u": "Desire 830 dual sim", "HTC Desire 830 dual sim": "Desire 830 dual sim", "HTC Desire C": "Desire C", "HTC D626w": "Desire D626w", "HTC D820mu": "Desire D820mini", "HTC 0PFH2": "Desire EYE", "HTC Desire EYE": "Desire EYE", "HTC_M910x": "Desire EYE", "HTC 0PFH11": "Desire EYE", "HTC Desire Eye": "Desire EYE", "001HT": "Desire HD", "HTC Desire HD A9191": "Desire HD", "Inspire HD": "Desire HD", "HTC Desire L dual sim": "T528w", "HTC Desire P": "Desire P", "HTC Desire S": "Desire S", "HTC Desire SV": "Desire SV", "HTC Desire Q": "Desire V", "HTC Desire U": "Desire V", "HTC Desire U dual sim": "Desire V", "HTC Desire V": "Desire V", "HTC PROMIN_U": "Desire V", "HTC PRO_DS": "Desire V", "HTC T327w": "Desire V", "HTC T328w": "Desire V", "HTC Desire VC": "Desire VC", "HTC Desire VC T328d": "Desire VC", "HTC PRO_DD": "Desire VC", "HTC T328d": "Desire VC", "HTC Desire X": "desire x", "HTC POO_U": "Desire X", "HTC Desire X dual sim": "Desire X dual sim", "HTC Desire XC dual sim": "Desire XC dual sim", "HTC_Desire_320": "Desire320", "HTC 0PKX2": "Desire626", "HTC 0PM912": "Desire626s", "HTC Desire 816G": "Desire815G", "HTC6435LVW": "Droid DNA", "Eris": "Droid Eris", "Pulse": "U8220", "ADR6300": "Droid Incredible", "HTC E9pt": "E9pt", "HTC E9pw": "E9pw", "HTC_E9pw": "E9pw", "HTC E9t": "E9t", "HTC E9w": "E9w", "HTC_E9x": "E9x", "HTCEVOV4G": "EVO 3D", "PG86100": "EVO 3D", "ISW12HT": "EVO 3D ISW12HT", "HTC EVO 3D X515a": "EVO 3D X515m", "HTC EVO 3D X515m": "EVO 3D X515m", "HTC Inspire 3D": "EVO 3D X515m", "EVO": "EVO LTE 4G", "PG06100": "EVO Shift 4G", "PC36100": "Evo 4G", "HTC Explorer": "Explorer A310e", "HTC Explorer A310b": "Explorer A310e", "HTC Explorer A310e": "Explorer A310e", "HTC Flyer": "Flyer", "HTC Flyer P510e": "Flyer", "HTC Flyer P511e": "Flyer", "HTC Flyer P512": "Flyer", "HTC_Flyer_P512_NA": "Flyer", "HTC Dream": "G1", "HTC Vision": "G2", "T-Mobile G2": "G2", "HTC 2PVG2": "HTC Desire 628 dual sim", "HTC 2PZC100": "U11", "HTC 2Q4R400": "HTC U11 EYEs", "HTC 2Q4R300": "HTC U11 EYEs", "HTC 2Q4R1": "HTC U11 EYEs", "HTC 2Q4R100": "HTC U11 EYEs", "HTC U11 Life": "U11 Life", "HTC 2Q4D200": "HTC U11+", "HTC U11 plus": "HTC U11+", "HTC_2Q4D100": "HTC U11+", "HTC331ZLVW": "HTCDesire612VZW", "HTC331ZLVWPP": "HTCDesire612VZW", "HTC Acquire": "HTCEVODesign4G", "HTC EVO Design C715e": "HTCEVODesign4G", "HTC Hero S": "HTCEVODesign4G", "HTC Kingdom": "HTCEVODesign4G", "PH44100": "HTCEVODesign4G", "HTC6600LVW": "HTCOneMaxVZW", "ERA G2 Touch": "Hero", "HTC Hero": "Hero", "T-Mobile G2 Touch": "Hero", "T-Mobile_G2_Touch": "Hero", "dopod A6288": "Hero", "HERO200": "Hero", "ADR6350": "Incredible 2", "HTC IncredibleS S710d": "Incredible 2", "HTC Incredible S": "Incredible S", "HTC_S710E": "Incredible S", "HTL21": "J Butterfly", "HTL22": "J One", "HTC J Z321e": "J Z321e", "HTX21": "KDDI Infobar A02", "HTC Legend": "Legend", "HTC M8si": "M8si", "HTC M8t": "M8t", "HTC One M9": "One M9", "HTC M9e": "M9e", "HTC One M9_Prime Camera Edition": "M9e", "HTC One M9s": "M9e", "HTC_M9e": "M9e", "HTC M9et": "M9et", "HTC M9ew": "M9ew", "HTC_M9ew": "M9ew", "HTC M9pw": "M9pw", "HTC_M9px": "M9px", "HTC M9w": "M9w", "Nexus 9": "Nexus 9 LTE", "HTC One dual sim": "One Dual Sim", "HTC One M8s": "ONE M8s", "HTC_0PKV1": "ONE M8s", "HTC One S": "One S", "HTC K2_U": "ONE SV", "HTC One SV": "One SV BLK", "HTC One": "One Google Play edition", "HTC One 801e": "One 801e", "HTC_PN071": "One", "HTC 802t": "One", "HTC 802t 16GB": "One", "HTC One dual 802d": "One Dual 802d", "HTCONE": "One", "HTC6500LVW": "One", "HTC M8Sd": "One (E8) dual sim", "HTC M8St": "One (E8) 时尚版", "HTC One_E8": "One_E8", "HTC_M8Sx": "One (E8)", "0PAJ5": "One (E8)", "HTC One_E8 dual sim": "One (E8) dual sim", "HTC_M8Sy": "One (E8) dual sim", "HTC 0PAJ4": "One (E8) dual sim", "HTC M8Sw": "One (E8) 时尚版   4G LTE双卡双待联通版", "HTC M8Ss": "One (E8) 時尚版4G LTE 移动版", "HTC 0P6B900": "One (M8 EYE)", "HTC One_M8 Eye": "One (M8 Eye)", "HTC 0P6B9": "One (M8 Eye)", "HTC M8w": "One (M8)", "HTC One_M8": "One (M8)", "HTC_0P6B": "One (M8)", "HTC_0P6B6": "One (M8)", "HTC_M8x": "One (M8)", "HTC One_M8 dual sim": "One (M8)", "HTC M8d": "One (M8)", "831C": "One (M8)", "HTC6525LVW": "One (M8)", "HTC M8e": "One (M8) (4G LTE 双卡双待 联通版)", "HTC One 801s": "One 801e", "HTC A9w": "One A9", "HTC One A9": "One A9", "HTC_A9u": "One A9", "2PQ93": "One A9", "HTC 2PWD1": "U Play", "HTC One A9s": "One A9s", "HTC_A9sx": "One A9s", "HTC 2PWD2": "One A9s", "HTC_M8Sd": "One E8 dual", "HTC 0PL31": "One E9 dual sim", "HTC One E9 dual sim": "One E9 dual sim", "HTC One E9PLUS dual sim": "One E9PLUS dual sim", "HTC D826sw": "One E9s dual sim", "HTC One E9s dual sim": "One E9s dual sim", "HTC_E9sx": "One E9s dual sim", "HTC M8Et": "One M8 eye 4G LTE", "HTC M8Ew": "One M8 eye 4G LTE", "0PJA10": "One M9", "HTC 0PJA10": "One M9", "HTC_0PJA10": "One M9", "HTC_M9u": "One M9", "0PJA2": "One M9", "HTC6535LRA": "One M9", "HTC6535LVW": "One M9", "HTC 0PK71": "One M9+ (Prime Camera Edition)", "HTC M9pt": "One M9+", "HTC_M9pw": "One M9+", "HTC One M9PLUS_Prime Camera Edition": "One M9+ (Prime Camera Edition)", "HTC 0PLA1": "One ME dual sim", "HTC One ME dual sim": "One ME dual sim", "HTC VLE_U": "One S", "HTC Z560e": "One S", "HTC One S Special Edition": "One S Special Edition", "HTC 2PRG100": "One S9", "HTC One S9": "One S9", "HTC_S9u": "One S9", "HTC One SC": "One SC", "HTC One SC T528d": "One SC", "C525c": "One SV", "HTC K2_UL": "One SV", "HTC One SV BLK": "One SV BLK", "HTC One V": "One V", "HTC ONE V": "One V", "HTC One VX": "One VX", "HTC One X": "Onex X", "HTC S720e": "S720e", "HTC 2PXH1": "One X10", "HTC One X10": "One X10", "HTC 2PXH2": "One X10", "HTC_X10u": "One X10", "HTC 2PXH3": "One X10", "HTC 2PS5200": "One X9", "HTC X9u": "One X9 dual sim", "HTC_X9u": "One X9 dual sim", "HTC One XL": "One XL", "HTC_One_XL": "One XL", "HTC EVA_UTL": "One XL", "HTC One max": "One max", "HTC_One_max": "One max", "HTC0P3P7": "One max", "HTC One mini": "One mini", "HTC_One_mini_601e": "One mini 601E", "HTC_PO582": "One mini", "HTC One mini 2": "One mini 2", "HTC_M8MINx": "One mini 2", "HTC_One_mini_2": "One mini 2", "HTC6515LVW": "One remix", "HTC PO091": "PO091", "HTC PG09410": "Puccini", "HTC-P715a": "Puccini", "HTC Rhyme S510b": "Rhyme S510b", "HTC Salsa C510b": "Salsa C510e", "HTC Salsa C510e": "Salsa C510e", "HTC Sensation": "Sensation 4G", "HTC Sensation 4G": "Sensation 4G", "HTC Sensation XE with Beats Audio": "Sensation 4G", "HTC Sensation XE with Beats Audio Z715a": "Sensation 4G", "HTC Sensation XE with Beats Audio Z715e": "Sensation 4G", "HTC Sensation Z710a": "Sensation 4G", "HTC Sensation Z710e": "Sensation 4G", "HTC-Z710a": "Sensation 4G", "HTC Sensation XL with Beats Audio X315b": "Sensation XL with Beats Audio X315e", "HTC Sensation XL with Beats Audio X315e": "Sensation XL with Beats Audio X315e", "HTC-X315E": "Sensation XL with Beats Audio X315e", "Sensation XL with Beats Audio": "Sensation XL with Beats Audio X315e", "HTC T329d": "T329d", "HTC 2PQ910": "Telstra Signature™ Premium", "ADR6400L": "Thunderbolt", "HTC Mecha": "Thunderbolt", "HTC U Play": "U Play", "HTC_U-2u": "U Play", "HTC 2PZM3": "U Play", "HTC U-1w": "U Ultra", "HTC U Ultra": "U Ultra", "HTC_U-1u": "U Ultra", "HTC 2PZF1": "U Ultra", "HTC U-3w": "U11", "HTC U11": "U11", "HTC_U-3u": "U11", "601HT": "U11", "HTV33": "U11", "2PZC5": "U11", "HTC U11 life": "U11 Life", "HTC 2Q55300": "U12 +", "HTC 2Q551": "U12+", "HTC 2Q551+": "U12+", "HTC 2Q55100": "U12+", "HTC U12+": "U12+", "HTC 2Q552": "U12+", "HTC PH39100": "Velocity 4G", "HTC Raider X710e": "Velocity 4G", "HTC Velocity 4G": "Velocity 4G", "HTC Velocity 4G X710s": "Velocity 4G", "HTC-X710a": "Velocity 4G", "HTC WF5w": "WF5w", "HTC Wildfire": "Wildfire CDMA", "HTC Bee": "Wildfire CDMA", "HTC Wildfire S": "Wildfire S", "HTC Wildfire S A510b": "Wildfire S", "HTC Wildfire S A510e": "Wildfire S", "HTC-A510a": "Wildfire S", "HTC Wildfire S A515c": "Wildfire S A515c", "HTC-PG762": "Wildfire S A515c", "USCCADR6230US": "Wildfire S A515c", "HTC Desire 400 dual sim": "desire 400 dual sim", "HTC first": "first", "HTC Magic": "myTouch 3G", "T-Mobile myTouch 3G": "myTouch 3G", "T-Mobile myTouch 3G Slide": "myTouch 3G Slide", "HTC Glacier": "myTouch 4G", "HTC Panache": "myTouch 4G", "myTouch_4G_Slide": "myTouch 4G Slide", "Andromax A36C5H": "A36C5H", "Haier A42P": "A42P", "Smartfren Andromax AD6B1H": "AD6B1H", "Haier_AL40": "AL40", "Andromax C46B2H": "C46B2H", "D2-721G": "D2-721", "HM-G553-FL": "G51", "HM-G552-FL": "G7", "I7A-LE": "GF88", "HS_9DTB37": "HS-9DTB37", "FORZA": "HW-I509-W", "Binatone Homesurf744 / Hubble Smart7 (Homesurf744)": "Haier", "PAD69H": "Haier", "pad_d85": "Haier", "W627": "Haier", "W861": "Haier", "HM-N700-FL": "haier lesure L7", "HM-G701-FL": "HaierG61", "Binatone Homesurf844 / Hubble Smart8 (Homesurf844)": "Homesurf844", "HyasongT1": "Hyasong T1", "HM-G152-FL": "L11", "Logicom-S9782": "Logicom S9782", "MS3A": "MEGAFON MS3A", "Q5002": "StarQ_Q5002", "Haier T50": "T50", "Haier T52P": "T52P", "Haier T54P": "T54P", "TAB700MPG": "TAB-700", "HM-V6": "Voyage V6", "Haier_i50": "i50", "NAUTIZ_X2": "Nautiz_X2", "Harris 12131-1000": "RF-3590-RT", "L925": "HERCLS L925", "Easy-Power": "Easy Power", "Easy-Power-Pro": "Easy Power Pro", "Easy_XL": "Easy XL", "Easy_XL_Pro": "Easy XL Pro", "FestXL": "Fest XL", "FestXL-Pro": "Fest XL PRO", "Fest-Pro": "K2050 C1 Fest Pro", "PowerFive": "Power Five", "PowerFour": "Power Four", "Power Ice Evo": "Power Ice EVO", "Power Ice Max": "PowerIceMax", "Power Rage Evo": "PowerRageEvo", "8DTB38": "Electron", "8DTB40": "Electron 2", "f100_65u": "F100", "10DTB12A": "HS-10DTB12A", "HS_10DTB12A": "HS-10DTB12A", "HS-10DTB41-8GB": "HS-10DTB41", "HS_7DTB35": "HS-7DTB35", "HS-7DTB40-8GB": "HS-7DTB40", "Dtac phone Joey Jet 2": "Joey Jet 2", "7DTB41": "Micron", "Nanho_T775": "Nanho T775", "10DTB10": "Phantom", "10DTB44": "Phantom2", "10DTB42": "Pilot", "11DTB1": "Synergy", "Vision": "55H6SG", "Hisense A2": "A2", "Hisense A2M": "A2M", "Hisense A2T": "A2T", "AGM X2": "AJM X2", "X2 SE": "AGM  X2", "X2_SE": "AGM  X2", "Hisense C1": "C1BE", "Hisense C1M": "C1M", "Hisense C1T": "C1T", "Hisense C20": "c20fe-3", "Hisense C20S": "C20S", "Hisense C30": "C30", "Hisense C30_02": "C30", "Hisense C30 Lite": "C30 Lite", "STARACTIVE 2": "C30 Lite", "SX40": "C30 Lite", "Hisense D1-M": "D1-M", "Hisense D5": "D5", "Hisense E100T": "E100T", "LT-W1": "E100TAE", "HS-E200T": "E200T", "Hisense E20T": "E20T", "HS-E260T": "E260T", "Hisense E260U": "E260U", "Hisense E360M": "E360M", "Hisense E50-T": "E50-T", "Hisense E51": "E51-W", "Hisense E51-M": "E51-M", "HS-E600M": "E600MH02", "Hisense E602T": "E602T", "Hisense E613M": "E613M", "Hisense E602M": "E620M", "Hisense E621T": "E621T", "Hisense E622M": "E622M", "Hisense E625T": "E625T", "Hisense E70-T": "E70-T", "Hisense E71-M": "E71-M", "Hisense E71-T": "E71-T", "Hisense E75M": "E75M", "Hisense E75T": "E75T", "Hisense E76": "E76E_11", "Hisense E77M": "E77M", "Hisense E77MINI": "E77MINI", "Hisense E9": "E9", "LT668": "EG68AE", "HS-EG936D": "EG936D", "HS-EG978": "EG978", "HS-EG981": "EG981", "BM001": "F10", "Hisense F10": "F10", "Hisense L675 Pro": "F10", "RIVIERA F10": "F10", "Hisense F102": "F102", "Hisense Hi 3": "F102", "Hisense F20": "F20", "Hisense F20T": "F20T", "Hisense F21T": "F21T", "Hisense F22": "F22", "Hisense F22M": "F22M", "Hisense F23": "F23", "Hisense T203": "F23", "RIVIERA F23": "F23", "Hisense F23M": "F23M", "Hisense F30": "F30", "Hisense F31": "F31E_11", "Hisense F31M": "F31M", "Hisense F32": "F32", "Hisense G610M": "G610M", "HS-H800T": "H800T", "Hisense H910": "H910-F01", "HLTE300E": "HLTE300E_ 02", "HLTE300E_02": "HLTE300E_ 02", "Hisense Infinity H11": "HLTE300E_ 02", "HS-G610": "HS- G610", "HS-L682": "L682", "msm8625": "HS-EG929", "U98": "HS-U98", "Hisense E7 Pro": "Hisense  E7  Pro", "Hisense F17 Pro": "Hisense  F17  Pro", "Hisense F23 PLUS": "Hisense  F23  PLUS", "Hisense Hi 2": "Hisense  Hi  2", "Hisense Infinity F17": "Hisense  Infinity  F17", "Hisense Infinity H12": "Hisense  Infinity  H12", "Hisense Infinity E7": "Hisense F17", "HLTE510T": "Hisense H20", "Hisense I300T": "I300T", "Andromax I56D2G": "I56D2G", "Hisense I630U": "I630U", "Hisense I631M": "I631M", "Hisense I632M": "I632M", "Hisense I632T": "I632T", "Hisense I635T": "I635T", "Hisense I639M": "I639M", "Hisense I639T": "I639T", "IRON 2": "IRON  2", "Hisense K1": "K1", "HS-L671": "L671W", "Hisense L671": "L671WE_2", "Hisense L675": "L675", "Hisense L676": "l676be", "Hisense L678": "L678", "Hisense L682": "L682", "HS-L691": "l691", "HS-L695": "L695W", "Hisense L695": "L695WE_2", "STARADDICT 6": "L730", "Hisense LED55K360X3D": "LED55K360X3D", "Vision20": "LED85XT910G3DU", "Hisense M10-M": "M10-M", "Hisense M20-T": "M20- T", "Hisense M20-M": "M20-M", "Hisense M30": "M30", "Hisense M30M": "M30M", "Hisense M30T": "M30T", "Hisense M36": "M36", "SMART 4G HD Voice": "M821T", "PX7": "PX1900ES", "Hisense PX3000": "PX3000", "PX8": "PX530", "S40": "STARTRAIL  9", "STARTRAIL 9": "STARTRAIL  9", "E2171CA": "Sero 7", "E2171MX": "Sero 7", "E2171TK": "Sero 7", "E2281": "Sero 8", "E2281CA": "Sero 8", "E2281MX": "Sero 8", "E2281TK": "Sero 8", "E2281UK": "Sero 8", "F5281": "Sero 8 pro", "E2171SS": "Sero7", "E2371": "Sero7 LE", "E2281SS": "Sero8", "Hisense SoundTab MA-317": "SoundTab MA-317", "Hisense SoundTab MA-327": "SoundTab MA-327", "Hisense T963": "T963", "hisense_gx1200v": "TV", "Hisense U601S": "U601S", "U601S Pro": "U601S  Pro", "HS-U602": "U602", "STARSHINE III": "U606", "HS-U606": "U606AE", "PHS-402": "U606AE", "Bouygues Telecom Bs 403": "U607", "HS-U609": "U609", "HS-U610": "U610", "HS-U688": "U688BE", "HS-U800": "U800E-1", "HS-U800E-1": "U800E-1", "Hisense U963": "U963", "RIVIERA U963": "U963", "HS-U988": "U988E-2", "Hisense U989": "U989", "Hisense U989 Pro": "U989 Pro", "H7": "Vidaa", "vision2_5": "Vision 2.5", "HS-X1": "X1E1", "XOLO T1000": "XOLO", "C20": "c20ae", "Hisense E76mini": "e76mini", "Hisense L830": "l830", "STARXTREM 6": "l830", "HAT4KDTV": "laoshan", "LT971": "lt971", "U972": "u972", "X-Max": "X Max", "LIFETAB_S9714": "Germany", "NABIXD-NV10C": "nabi_XD", "14A-DA": "A-DA", "MY15ADA": "Spirior", "MY18ADA": "A-DA", "MY17ADA": "A-DA", "MY16ADA": "Accord", "MY19ADA": "S660", "SiRFSoC Android": "Unit Assy AVN", "Dolphin 70e Black": "70eLWN", "CX75 AC0": "CK75", "CX75 AN0": "CK75", "CN51 NC0": "CN51", "CN51 NCF": "CN51", "CN51 NCU": "CN51", "CN51 NN0": "CN51", "CN51 QC0": "CN51", "CN51 QCF": "CN51", "CN51 QCU": "CN51", "CN51 QN0": "CN51", "CX75 NC0": "CN75E", "CX75 NCF": "CN75E", "CX75 QC0": "CN75E", "CX75 QCF": "CN75E", "CT60": "CT60-L1N-C", "CT50": "Dolphin CT50", "Glory50": "EDA50", "Glory EDA50K": "EDA50K", "EDA50": "EdA50", "Magic 5 Plus": "Magic_5_Plus", "704-G": "HT704-G", "HUAWEI A199": "A199", "U9500": "Ascend D", "HUAWEI G510-0251": "Ascend G510", "HUAWEI Ascend G525": "Ascend G525", "HUAWEI G525-U00": "Ascend G525", "HUAWEI B199": "B199", "HUAWEI C199": "C199", "HUAWEI C199s": "C199s", "HUAWEI C8812": "C8812", "HUAWEI C8813D": "C8813D", "HUAWEI C8813DQ": "C8813DQ", "HUAWEI C8815": "C8815", "HUAWEI C8816": "C8816", "HUAWEI C8816D": "C8816D", "HUAWEI C8817E": "C8817E", "HUAWEI C8817L": "C8817L", "HUAWEI C8818": "C8818", "HUAWEI C8826D": "C8826D", "HUAWEI-C8850": "C8850", "CHC-U01": "Cherry Mini", "M330": "China", "H1611": "Copper Plus", "HUAWEI H1611": "Copper Plus", "HUAWEI D2-0082": "D2", "HUAWEI D2-2010": "D2", "HUAWEI D2-6070": "D2", "HUAWEI P8max": "P8max", "HUAWEI LUA-L03": "ECO", "HUAWEI LUA-L13": "ECO", "HUAWEI LUA-L23": "ECO", "HUAWEI LUA-U03": "ECO", "HUAWEI LUA-U23": "ECO", "HuaweiES8500": "ES8500", "Huawei-U8665": "Fusion 2", "HUAWEI G350": "G350", "HUAWEI G350-U00": "G350", "HUAWEI G350-U20": "G350-U20", "HUAWEI G506-U151": "G506", "HUAWEI G510-0010": "G510", "HUAWEI G510-0100": "G510", "HuaweiG510-0100": "G510", "HuaweiG510-0100-orange": "G510", "HUAWEI Ascend G510": "G510", "HUAWEI G510-0200": "G510", "Orange Daytona": "G510", "HUAWEI G520-5000": "G520", "HUAWEI G521-L076": "G521-L076", "HUAWEI G521-L176": "G521-L176", "G526-L11": "G526", "G526-L22": "G526", "G526-L33": "G526", "G527-U081": "G527", "HUAWEI G535-L11": "G535-L11", "Kestrel": "G535-L11", "Orange Gova": "G535-L11", "Speedsurfer": "G535-L11", "Ultym5": "G535-L11", "HUAWEI G6-T00": "G6", "HUAWEI G6-C00": "G6-C00", "HUAWEI G6-L11": "G6-L11", "HUAWEI G6-L22": "G6-L22", "HUAWEI G6-L33": "G6-L33", "HUAWEI G6-U00": "G6-U00", "HUAWEI G6-U10": "G6-U10", "HUAWEI G6-U251": "G6-U251", "HUAWEI G6-U34": "G6-U34", "HUAWEI G606-T00": "G606-T00", "HUAWEI G610-T00": "G610", "G610-U00": "G610", "HUAWEI G610-U00": "G610", "HUAWEI G610-U30": "G610", "HUAWEI G610-T01": "G610-T01", "HUAWEI G610-T11": "G610-T11", "HUAWEI G610-U15": "G610-U15", "HUAWEI G610-U20": "G610-U20", "HUAWEI G610-C00": "G610C", "HUAWEI G615-U10": "G615-U10", "HUAWEI G616-L076": "G616-L076", "HUAWEI G620-A2": "G620-A2", "HUAWEI G620-L72": "G620-L72", "HUAWEI G620": "G620S-L03", "Personal Huawei G620S": "G620S-L03", "HUAWEI G628-TL00": "G628-TL00", "HUAWEI G629-UL00": "G629-UL00", "HUAWEI G630-T00": "G630", "HUAWEI G630-U00": "G630-U00", "HUAWEI G630-U251": "G630-U251", "HUAWEI G660-L075": "G660-L075", "HUAWEI RIO-TL00": "G7 Plus", "HUAWEI RIO-UL00": "G7 Plus", "HUAWEI G7-L01": "G7-L01", "HUAWEI G7-L02": "G7-L02", "HUAWEI G7": "G7-L03", "HUAWEI G7-L03": "G7-L03", "HUAWEI G7-L11": "G7-L11", "HUAWEI G7-TL00": "G7-TL00", "HUAWEI G7-UL20": "G7-UL20", "HUAWEI G700-T00": "G700", "HUAWEI G700-U00": "G700", "HUAWEI G700-T01": "G700-T01", "HUAWEI G700-U10": "G700-U10", "HUAWEI G700-U20": "G700-U20", "HUAWEI G716-L070": "G716", "HUAWEI G718": "G718", "HUAWEI G730-C00": "G730", "HUAWEI G730-T00": "G730", "HUAWEI G730-U00": "G730", "HUAWEI G730-L075": "G730-L075", "HUAWEI G730-U10": "G730-U10", "HUAWEI G730-U251": "G730-U251", "HUAWEI G730-U27": "G730-U27", "HUAWEI G730-U30": "G730-U30", "G740-L00": "G740", "Orange Yumo": "G740", "HUAWEI G750-T00": "G750-T00", "HUAWEI G750-T01": "G750-T01", "HUAWEI G750-T01M": "G750-T01M", "HUAWEI G750-T20": "G750-T20", "HUAWEI G750-U10": "G750-U10", "HUAWEI G7500": "G7500", "HUAWEI RIO-L02": "G8", "HUAWEI RIO-L03": "G8", "RIO-L03": "G8", "HUAWEI MLA-TL00": "G9 Plus", "HUAWEI MLA-TL10": "G9 Plus", "HUAWEI MLA-UL00": "G9 Plus", "MLA-TL00": "G9 Plus", "MLA-UL00": "G9 Plus", "HUAWEI VNS-AL00": "G9青春版", "HUAWEI TAG-L01": "GR3", "HUAWEI TAG-L03": "GR3", "HUAWEI TAG-L13": "GR3", "HUAWEI TAG-L21": "GR3", "HUAWEI TAG-L22": "GR3", "HUAWEI TAG-L23": "GR3", "DIG-L01": "GR3 2017", "DIG-L21": "GR3 2017", "DIG-L22": "GR3 2017", "HUAWEI TAG-L32": "GR3 Smart touch", "HUAWEI KII-L03": "GR5", "HUAWEI KII-L05": "GR5", "HUAWEI KII-L21": "GR5", "HUAWEI KII-L22": "GR5", "HUAWEI KII-L23": "GR5", "HUAWEI KII-L33": "GR5", "KII-L21": "GR5", "H1621": "GR5W", "HUAWEI NMO-L21": "GT3", "HUAWEI NMO-L22": "GT3", "HUAWEI NMO-L23": "GT3", "HUAWEI NMO-L31": "GT3", "HUAWEI": "GX8", "HUAWEI RIO-L01": "GX8", "Orinoquia Gran Roraima + S7-722u": "Gran_Roraima", "HONOR H30-L01": "H30-L01", "HONOR H30-L01M": "H30-L01M", "HONOR H30-L02": "H30-L02", "H60-L01": "H60", "HW-H60-J1": "H60-J1", "HUAWEI H871G": "H871G", "HUAWEI H891L": "H891L", "HUAWEI H892L": "H892L", "CAG-L22": "HUAWEI Y3 2018", "Che2-L12": "HONOR 4X", "SLA-L03": "HUAWEI G Elite Plus", "BLL-L21": "HUAWEI GR5 2017", "BLL-L22": "HUAWEI GR5 2017", "HUAWEI BLL-L21": "HUAWEI GR5 2017", "HUAWEI BLL-L22": "HUAWEI GR5 2017", "BLL-L23": "HUAWEI Mate 9 lite", "HUAWEI BLL-L23": "HUAWEI Mate 9 lite", "BND-L34": "HUAWEI Mate SE", "701HW": "HUAWEI MediaPad M3 Lite", "702HW": "HUAWEI MediaPad M3 Lite", "CPN-AL00": "HUAWEI MediaPad M3 Lite", "CPN-L09": "HUAWEI MediaPad M3 Lite", "CPN-W09": "HUAWEI MediaPad M3 Lite", "HDN-L09": "HUAWEI MediaPad M3 Lite 10 wp", "HDN-W09": "HUAWEI MediaPad M3 Lite 10 wp", "CMR-AL09": "HUAWEI MediaPad M5 10.8\"", "CMR-W09": "HUAWEI MediaPad M5 10.8\"", "SHT-AL09": "HUAWEI MediaPad M5 8.4\"", "SHT-W09": "HUAWEI MediaPad M5 8.4\"", "CMR-AL19": "HUAWEI MediaPad M5 Pro", "CMR-W19": "HUAWEI MediaPad M5 Pro", "BAH2-L09": "HUAWEI MediaPad M5 lite", "BAH2-W19": "HUAWEI MediaPad M5 lite", "AGS-L03": "HUAWEI MediaPad T3 10", "AGS-L09": "HUAWEI MediaPad T3 10", "AGS-W09": "HUAWEI MediaPad T3 10", "BG2-U03": "HUAWEI MediaPad T3 7", "FIG-LA1": "HUAWEI P smart", "FIG-LX2": "HUAWEI P smart", "FIG-LX3": "HUAWEI P smart", "ANE-LX2J": "HUAWEI P20 Lite", "HWV32": "HUAWEI P20 Lite", "SLA-L02": "HUAWEI P9 lite mini", "SLA-L22": "HUAWEI P9 lite mini", "SLA-L23": "HUAWEI P9 lite mini", "CRO-L02": "HUAWEI Y3 2017", "CRO-L22": "HUAWEI Y3 2017", "HUAWEI CRO-L02": "HUAWEI Y3 2017", "HUAWEI CRO-L22": "HUAWEI Y3 2017", "CAG-L02": "HUAWEI Y3 2018", "DRA-L01": "HUAWEI Y5 2018", "DRA-L21": "HUAWEI Y5 2018", "DRA-LX2": "HUAWEI Y5 Prime 2018", "DRA-LX3": "HUAWEI Y5 2018", "CRO-L03": "HUAWEI Y5 lite 2017", "CRO-L23": "HUAWEI Y5 lite 2017", "HUAWEI CRO-L03": "HUAWEI Y5 lite 2017", "HUAWEI CRO-L23": "HUAWEI Y5 lite 2017", "CAG-L03": "HUAWEI Y5 lite 2018", "CAG-L23": "HUAWEI Y5 lite 2018", "MYA-L11": "HUAWEI Y6 2017", "ATU-L11": "HUAWEI Y6 2018", "ATU-L21": "HUAWEI Y6 2018", "ATU-L22": "HUAWEI Y6 2018", "ATU-LX3": "HUAWEI Y6 2018", "ATU-L31": "HUAWEI Y6 Prime 2018", "ATU-L42": "HUAWEI Y6 Prime 2018", "HUAWEI CAM-L53": "HUAWEI Y6II", "LDN-L01": "HUAWEI Y7 2018", "LDN-L21": "HUAWEI Y7 Prime 2018", "LDN-LX3": "HUAWEI Y7 2018", "FLA-LX1": "HUAWEI Y9 2018", "FLA-LX2": "HUAWEI Y9 2018", "FLA-LX3": "HUAWEI Y9 2018", "BAC-L21": "HUAWEI nova 2 Plus", "BAC-L22": "HUAWEI nova 2 Plus", "LDN-LX2": "HUAWEI nova 2 lite", "704HW": "HUAWEI nova lite 2", "608HW": "HUAWEI nova lite for Y!mobile", "KOB-L09": "HUWEI MediaPad T3", "KOB-W09": "HUWEI MediaPad T3", "COL-AL00": "Honor 10", "COL-AL10": "Honor 10", "COL-L29": "Honor 10", "COL-TL10": "Honor 10", "SCC-U21": "Y6", "SCL-AL00": "荣耀4A", "SCL-CL00": "Honor 4A", "SCL-TL00": "Honor 4A", "SCL-TL00H": "Honor 4A", "HUAWEI LYO-L21": "Honor 5A", "LYO-L21": "Honor 5A", "NEM-L21": "Honor 5C", "NEM-L22": "Honor 5C", "NEM-L51": "Honor 5C", "KIW-L21": "Honor 5X", "KIW-TL00H": "Honor 5X", "DLI-L22": "Honor 6A", "DLI-TL20": "Honor 6A", "BLN-L24": "Honor 6X", "PLK-AL10": "Honor 7", "PLK-CL00": "Honor 7", "PLK-L01": "Honor 7", "PLK-TL00": "Honor 7", "PLK-TL01H": "Honor 7", "PLK-UL00": "Honor 7", "AUM-AL00": "Honor 7A", "AUM-AL20": "Honor 7A", "AUM-L29": "Honor 7A", "AUM-L33": "Honor 7A", "AUM-TL00": "Honor 7A", "AUM-TL20": "Honor 7A", "DUA-L22": "Honor 7S", "AUM-L41": "Honor 7C", "LND-AL30": "Honor 7C", "LND-AL40": "Honor 7C", "LND-L29": "Honor 7C", "LND-TL30": "Honor 7C", "LND-TL40": "Honor 7C", "DUA-AL00": "荣耀畅玩7", "DUA-LX3": "Honor 7S", "BND-L21": "Honor 7X", "BND-L24": "Honor 7X", "BND-L31": "Honor 7X", "ATH-AL00": "Honor 7i", "ATH-CL00": "Honor 7i", "FRD-AL00": "Honor 8", "FRD-AL10": "Honor 8", "FRD-DL00": "Honor 8", "FRD-L04": "Honor 8", "FRD-L09": "Honor 8", "FRD-L14": "Honor 8", "FRD-L19": "Honor 8", "FRD-L24": "Honor 8", "FRD-TL00": "Honor 8", "PRA-LX1": "P8 lite 2017", "DUK-L09": "Honor 8 Pro", "VEN-L22": "Honor 8 Smart", "STF-AL00": "Honor 9", "STF-AL10": "Honor 9", "STF-L09": "Honor 9", "STF-TL10": "Honor 9", "LLD-L21": "Honor 9 Lite", "LLD-L31": "Honor 9 Lite", "M321": "Honor Box", "HiTV-M1": "Honor Box Pro", "M311": "Honor Box voice", "HUAWEI NTS-AL00": "Honor Magic", "NTS-AL00": "Honor Magic", "RVL-AL09": "Honor Note10", "COR-AL00": "Honor Play", "COR-AL10": "Honor Play", "COR-L29": "Honor Play", "COR-TL10": "Honor Play", "BKL-AL00": "Honor V10", "BKL-AL20": "Honor V10", "BKL-TL10": "Honor V10", "KNT-AL10": "Honor V8", "KNT-AL20": "Honor V8", "KNT-TL10": "Honor V8", "KNT-UL10": "Honor V8", "DUK-AL20": "Honor V9", "DUK-TL30": "Honor V9", "BKL-L04": "Honor View 10", "BKL-L09": "Honor View 10", "H30-T10": "Honor3", "H30-U10": "Honor3", "HUAWEI HN3-U00": "Honor3", "HUAWEI HN3-U01": "Honor3", "H1711": "Huawei Ascend XT2™", "H1711z": "Huawei Elate™", "AGS2-L09": "Huawei MediaPad T5", "PIC-LX9": "Huawei Nova 2", "Comet": "IDEOS", "Ideos": "IDEOS", "Huawei U8800-51": "Ideos X5", "IDEOS X5": "Ideos X5", "U8800": "Ideos X5", "U8800-51": "Ideos X5", "H1622": "Kiwi-2", "HUAWEI M2-A01L": "LISZT", "HUAWEI M2-A01W": "LISZT", "HUAWEI M2-801L": "M2", "HUAWEI M2-801W": "M2", "HUAWEI M2-802L": "M2", "HUAWEI M2-803L": "M2", "M220c": "M220", "dTV01": "M220", "BTV-DL09": "M3", "BTV-W09": "M3", "TB01": "M620", "HUAWEI-M835": "M835", "USCCADR3305": "M865", "HUAWEI M868": "M868", "RNE-AL00": "MAIMANG 6", "HUAWEI MT1-U06": "MT1", "HUAWEI MT2-L01": "MT2-L01", "HUAWEI MT2-L02": "MT2-L02", "MT2L03": "MT2L03LITE", "HUAWEI MT2-L05": "MT2-L05", "HUAWEI MT1-T00": "Mate", "ALP-AL00": "Mate 10", "ALP-L09": "Mate 10", "ALP-L29": "Mate 10", "ALP-TL00": "Mate 10", "BLA-A09": "Mate 10 Pro", "BLA-AL00": "Mate 10 Pro", "BLA-L09": "Mate 10 Pro", "BLA-L29": "Mate 10 Pro", "BLA-TL00": "Mate 10 Pro", "RNE-L01": "Mate 10 lite", "RNE-L03": "Mate 10 lite", "RNE-L21": "Mate 10 lite", "RNE-L23": "Mate 10 lite", "HUAWEI MT7-CL00": "Mate 7", "HUAWEI MT7-J1": "Mate 7", "HUAWEI MT7-L09": "Mate 7", "HUAWEI MT7-TL00": "Mate 7", "HUAWEI MT7-TL10": "Mate 7", "HUAWEI MT7-UL00": "Mate 7", "HUAWEI NXT-AL10": "Mate 8", "HUAWEI NXT-CL00": "Mate 8", "HUAWEI NXT-DL00": "Mate 8", "HUAWEI NXT-L09": "Mate 8", "HUAWEI NXT-L29": "Mate 8", "HUAWEI NXT-TL00": "Mate 8", "HUAWEI NXT-TL00B": "Mate 8", "NXT-AL10": "Mate 8", "NXT-CL00": "Mate 8", "NXT-DL00": "Mate 8", "NXT-L09": "Mate 8", "NXT-L29": "Mate 8", "NXT-TL00": "Mate 8", "MHA-AL00": "Mate 9", "MHA-L09": "Mate 9", "MHA-L29": "Mate 9", "MHA-TL00": "Mate 9", "LON-AL00": "Mate 9 Pro", "LON-L29": "Mate 9 Pro", "HUAWEI CRR-CL00": "Mate S", "HUAWEI CRR-CL20": "Mate S", "HUAWEI CRR-L09": "Mate S", "HUAWEI CRR-TL00": "Mate S", "HUAWEI CRR-UL00": "Mate S", "HUAWEI CRR-UL20": "Mate S", "HUAWEI MT2-C00": "Mate2", "HUAWEI MediaPad T1 7.0 3G": "MediaPad", "T1 7.0": "MediaPad", "T1-701u": "MediaPad", "T1-701ua": "MediaPad", "T1-701us": "MediaPad", "T1-701w": "MediaPad", "Telpad QS": "MediaPad 7 Lite Quad", "MediaPad 10 LINK": "S10", "dtab 01": "MediaPad 10 Link", "402HW": "MediaPad 10 Link+", "S10-232L": "MediaPad 10 Link+", "SpeedTAB": "MediaPad 10 Link+", "Telpad Quad S": "MediaPad 7 Lite Quad", "MediaPad 7 Youth 2": "MediaPad 7 Youth2", "S7-721u": "MediaPad 7 Youth2", "403HW": "MediaPad M1 8.0", "CNPC Security Pad S1": "MediaPad M1 8.0", "HUAWEI MediaPad M1 8.0": "MediaPad M1 8.0", "MediaPad M1 8.0 (LTE)": "MediaPad M1 8.0", "MediaPad M1 8.0 (WIFI)": "MediaPad M1 8.0", "S8-303L": "MediaPad M1 8.0", "S8-303LT": "MediaPad M1 8.0", "S8-306L": "MediaPad M1 8.0", "BAH-AL00": "MediaPad M3 Lite 10", "BAH-L09": "MediaPad M3 Lite 10", "BAH-W09": "MediaPad M3 Lite 10", "605HW": "MediaPad T2 10.0 Pro", "606HW": "MediaPad T2 10.0 Pro", "FDR-A05L": "MediaPad T2 10.0 Pro", "FDR-A01L": "MediaPad T2 10.0 pro", "FDR-A01w": "MediaPad T2 10.0 pro", "FDR-A03L": "MediaPad T2 10.0 pro", "BGO-DL09": "MediaPad T2 7.0", "BGO-L03": "MediaPad T2 7.0", "JDN-AL00": "MediaPad T2 8.0 Pro", "JDN-L01": "MediaPad T2 8.0 Pro", "JDN-W09": "MediaPad T2 8.0 Pro", "BG2-U01": "MediaPad T3 7", "BG2-W09": "MediaPad T3 7", "MediaPad 7 Lite II": "Vogue7", "MediaPad 7 Vogue": "Vogue7", "7D-501u": "MediaPad X1 7.0", "MediaPad X1": "MediaPad X1 7.0", "X1 7.0": "MediaPad X1 7.0", "MediaPad 7 Youth": "S7", "M380-10": "MediaQ M380", "VTR-AL00": "P10", "VTR-L09": "P10", "VTR-L29": "P10", "VTR-TL00": "P10", "VKY-AL00": "P10 Plus", "VKY-L09": "P10 Plus", "VKY-L29": "P10 Plus", "VKY-TL00": "P10 Plus", "WAS-L03T": "P10 lite", "WAS-LX1": "P10 lite", "WAS-LX1A": "P10 lite", "WAS-LX2": "P10 lite", "WAS-LX2J": "P10 lite", "WAS-LX3": "P10 lite", "HUAWEI P2-6070": "P2", "EML-AL00": "P20", "EML-L09": "P20", "EML-L29": "P20", "EML-TL00": "P20", "HW-01K": "P20 Pro", "CLT-AL00": "P20 Pro", "CLT-AL01": "P20 Pro", "CLT-L04": "P20 Pro", "CLT-L09": "P20 Pro", "CLT-L29": "P20 Pro", "CLT-TL00": "P20 Pro", "CLT-TL01": "P20 Pro", "ANE-LX1": "P20 lite", "ANE-LX2": "P20 lite", "ANE-LX3": "P20 lite", "HUAWEI P6-C00": "P6", "HUAWEI P6-T00": "P6", "HUAWEI P6-T00V": "P6", "HUAWEI Ascend P6": "P6", "HUAWEI P6-U06": "P6", "HUAWEI P6-U06-orange": "P6", "P6 S-L04": "P6S", "302HW": "P6S-L04", "HUAWEI P6 S-U06": "P6S-U06", "HUAWEI P7-L00": "P7", "HUAWEI P7-L05": "P7", "HUAWEI P7-L07": "P7", "HUAWEI P7-L10": "P7", "HUAWEI P7-L11": "P7", "HUAWEI P7-L12": "P7", "HUAWEI P7 mini": "P7 mini", "HUAWEI P7-L09": "P7-L09", "HUAWEI GRA-CL00": "P8", "HUAWEI GRA-CL10": "P8", "HUAWEI GRA-L09": "P8", "HUAWEI GRA-TL00": "P8", "HUAWEI GRA-UL00": "P8", "HUAWEI GRA-UL10": "P8", "503HW": "P8 Lite", "ALE-L02": "P8 Lite", "ALE-L21": "P8 Lite", "ALE-L23": "P8 Lite", "Autana LTE": "P8 Lite", "HUAWEI ALE-CL00": "P8 Lite", "HUAWEI ALE-L04": "P8 Lite", "PRA-LA1": "P8 lite 2017", "ALE-TL00": "P8 青春版", "ALE-UL00": "P8 青春版", "EVA-AL00": "P9", "EVA-AL10": "P9", "EVA-CL00": "P9", "EVA-DL00": "P9", "EVA-L09": "P9", "EVA-L19": "P9", "EVA-L29": "P9", "EVA-TL00": "P9", "HUAWEI VNS-L52": "P9 Lite PREMIUM", "VIE-AL10": "P9 Plus", "VIE-L09": "P9 Plus", "VIE-L29": "P9 Plus", "HUAWEI VNS-L21": "P9 lite", "HUAWEI VNS-L22": "P9 lite", "HUAWEI VNS-L23": "P9 lite", "HUAWEI VNS-L31": "P9 lite", "HUAWEI VNS-L53": "P9 lite", "HUAWEI VNS-L62": "P9 lite", "DIG-L03": "P9 lite smart", "DIG-L23": "P9 lite smart", "NEO-AL00": "PORSCHE DESIGN HUAWEI Mate RS", "NEO-L29": "PORSCHE DESIGN HUAWEI Mate RS", "HUAWEI RIO-CL00": "RIO-CL00", "MediaPad 10 FHD": "S10", "Orinoquia Roraima S7-932u": "S7", "MediaPad 7 Lite+": "S7", "Telpad Dual S": "S7", "HUAWEI SC-CL00": "SC-CL00", "HUAWEI SC-UL10": "SC-UL10", "H710VL": "Sensa LTE", "H715BL": "Sensa LTE", "HUAWEI ATH-UL01": "ShotX", "HUAWEI ATH-UL06": "ShotX", "Huawei_8100-9": "T-Mobile Pulse", "Tactile internet": "T-Mobile Pulse", "U8100": "T-Mobile Pulse", "Videocon_V7400": "T-Mobile Pulse", "T1-821L": "T1", "T1-821W": "T1", "T1-821w": "t1_8p0lte", "T1-823L": "t1_8p0lte", "HUAWEI MediaPad T1 10 4G": "T1 10", "T1-A21L": "T1 10", "T1-A21W": "T1 10", "T1-A21w": "T1 10", "T1-A22L": "T1 10", "T1-A23L": "T1 10", "T-101": "T101", "T101 PAD": "T101", "QH-10": "T102", "T102 PAD": "T102", "T801 PAD": "T801", "MT-803G": "T802", "T802 PAD": "T802", "HUAWEI T8808D": "T8808D", "HUAWEI TAG-AL00": "TANGO", "HUAWEI TAG-CL00": "TANGO", "HUAWEI TAG-TL00": "TANGO", "Vodafone 845": "U8120", "U8220PLUS": "U8220", "Huawei-U8652": "U8652", "Huawei-U8687": "U8687", "HUAWEI-U8850": "U8850", "HUAWEI-U9000": "U9000", "Y538": "UNION", "Huawei 858": "V858", "MTC 950": "V858", "MTC Mini": "V858", "Vodafone 858": "V858", "MediaPad 7 Classic": "Vogue7", "HUAWEI WATCH": "WATCH", "HUAWEI-WATCH": "WATCH", "LEO-BX9": "Watch 2", "LEO-DLXX": "Watch 2", "GEM-701L": "X2", "GEM-702L": "X2", "GEM-703L": "X2", "GEM-703LT": "X2", "Orinoquia Auyantepui Y210": "Y210", "Y220-U00": "Y220", "Y220-U05": "Y220", "Y220-U17": "Y220", "HUAWEI Y220-T10": "Y220-T10", "HUAWEI Y 220T": "Y220T", "HUAWEI Y221-U03": "Y221-U03", "ORINOQUIA Auyantepui+Y221-U03": "Y221-U03", "HUAWEI Y221-U12": "Y221-U12", "HUAWEI Y221-U22": "Y221-U22", "HUAWEI Y221-U33": "Y221-U33", "HUAWEI Y221-U43": "Y221-U43", "HUAWEI Y221-U53": "Y221-U53", "HUAWEI Ascend Y300": "Y300", "HUAWEI Y300-0100": "Y300", "HUAWEI Y300-0151": "Y300", "Pelephone-Y300-": "Y300", "HUAWEI Y300-0000": "Y300-0000", "Huawei Y301A1": "Y301A1", "Huawei Y301A2": "Y301A2", "HUAWEI Y310-5000": "Y310-5000", "HUAWEI Y310-T10": "Y310-T10", "HUAWEI Y320-C00": "Y320", "HUAWEI Y320-T00": "Y320-T00", "HUAWEI Y320-U01": "Y320-U01", "HUAWEI Y320-U10": "Y320-U10", "HUAWEI Y320-U151": "Y320-U151", "HUAWEI Y320-U30": "Y320-U30", "HUAWEI Y320-U351": "Y320-U351", "HUAWEI Y321-U051": "Y321", "HUAWEI Y321-C00": "Y321", "HUAWEI Y325-T00": "Y325-T00", "Bucare Y330-U05": "Y330", "HUAWEI Y330-U05": "Y330", "HUAWEI Y330-U21": "Y330", "HUAWEI Y330-C00": "Y330-C00", "HUAWEI Y330-U01": "Y330-U01", "Luno": "Y330-U01", "HUAWEI Y330-U07": "Y330-U07", "HUAWEI Y330-U08": "Y330-U08", "HUAWEI Y330-U11": "Y330-U11", "V8510": "Y330-U11", "HUAWEI Y330-U15": "Y330-U15", "HUAWEI Y330-U17": "Y330-U17", "HUAWEI Y336-A1": "Y336-A1", "HUAWEI Y336-U02": "Y336-U02", "HUAWEI Y336-U12": "Y336-U12", "HUAWEI Y360-U03": "Y360-U03", "HUAWEI Y360-U103": "Y360-U103", "HUAWEI Y360-U12": "Y360-U12", "HUAWEI Y360-U23": "Y360-U23", "HUAWEI Y360-U31": "Y360-U31", "HUAWEI Y360-U42": "Y360-U42", "HUAWEI Y360-U61": "Y360-U61", "HUAWEI Y360-U72": "Y360-U72", "HUAWEI Y360-U82": "Y360-U82", "Delta Y360-U93": "Y360-U93", "HUAWEI Y360-U93": "Y360-U93", "HUAWEI LUA-L01": "Y3II", "HUAWEI LUA-L02": "Y3II", "HUAWEI LUA-L21": "Y3II", "HUAWEI LUA-U02": "Y3II", "HUAWEI LUA-U22": "Y3II", "CRO-U00": "Y3III", "CRO-U23": "Y3III", "HUAWEI CRO-U00": "Y3III", "HUAWEI CRO-U23": "Y3III", "HUAWEI Y560-L02": "Y5", "HUAWEI Y560-L23": "Y5", "HUAWEI Y560-U03": "Y5", "MYA-AL00": "Y5 2017", "MYA-L02": "Y5 2017", "MYA-L03": "Y5 2017", "MYA-L13": "Y5 2017", "MYA-L22": "Y5 2017", "MYA-L23": "Y5 2017", "MYA-TL00": "Y5 2017", "MYA-U29": "Y5 2017", "HUAWEI Y500-T00": "Y500-T00", "HUAWEI Y511-T00": "Y511-T00", "HUAWEI Y511-U10": "Y511-U10", "HUAWEI Y511-U251": "Y511-U251", "HUAWEI Y511-U30": "Y511-U30", "VIETTEL V8506": "Y511-U30", "HUAWEI Y516-T00": "Y516-", "HUAWEI Y518-T00": "Y518-T00", "HUAWEI Y520-U03": "Y520-U03", "HUAWEI Y520-U12": "Y520-U12", "HUAWEI Y520-U22": "Y520-U22", "HUAWEI Y520-U33": "Y520-U33", "HUAWEI Y523-L076": "Y523-L076", "HUAWEI Y523-L176": "Y523-L176", "HUAWEI Y530-U00": "Y530", "HUAWEI Y530": "Y530-U051", "HUAWEI Y530-U051": "Y530-U051", "HUAWEI Y535-C00": "Y535", "HUAWEI Y535D-C00": "Y535D-C00", "HUAWEI Y536A1": "Y536-A1", "HUAWEI Y540-U01": "Y540-U01", "HUAWEI Y541-U02": "Y541-U02", "HUAWEI Y550-L01": "Y550-L01", "HUAWEI Y550-L02": "Y550-L02", "HUAWEI Y550": "Y550-L03", "HUAWEI Y550-L03": "Y550-L03", "Personal Huawei Y550": "Y550-L03", "HUAWEI Y560-CL00": "Y560-CL00", "HUAWEI Y560-L01": "Y560-L01", "HUAWEI Y560-L03": "Y560-L03", "HUAWEI Y560-U02": "Y560-U02", "HUAWEI Y560-U12": "Y560-U12", "HUAWEI Y560-U23": "Y560-U23", "CUN-L22": "Y5II", "HUAWEI CUN-L01": "Y5II", "HUAWEI CUN-L02": "Y5II", "HUAWEI CUN-L03": "Y5II", "HUAWEI CUN-L21": "Y5II", "HUAWEI CUN-L22": "Y5II", "HUAWEI CUN-L23": "Y5II", "HUAWEI CUN-L33": "Y5II", "HUAWEI CUN-U29": "Y5II", "HUAWEI SCC-U21": "Y6", "HUAWEI SCL-L01": "Y6", "HUAWEI SCL-L02": "Y6", "HUAWEI SCL-L03": "Y6", "HUAWEI SCL-L04": "Y6", "HUAWEI SCL-L21": "Y6", "HW-SCL-L32": "Y6", "SCL-L01": "Dive_70", "HUAWEI SCL-U23": "Y6", "HUAWEI SCL-U31": "Y6", "SCL-U23": "Y6", "MYA-L41": "Y6 2017", "HUAWEI LYO-L02": "Y6 Elite", "HUAWEI TIT-AL00": "Y6 Pro", "HUAWEI TIT-CL10": "Y6 Pro", "HUAWEI TIT-L01": "Y6 Pro", "HUAWEI TIT-TL00": "Y6 Pro", "TIT-AL00": "Y6 Pro", "TIT-L01": "Y6 Pro", "HUAWEI TIT-CL00": "Y6 Pro", "HUAWEI TIT-U02": "Y6 Pro", "HUAWEI LYO-L01": "Y6 Ⅱ Compact", "HUAWEI Y600-U00": "Y600", "HUAWEI Y600-U151": "Y600", "HUAWEI Y600-U20": "Y600", "HUAWEI Y600-U351": "Y600-U351", "HUAWEI Y600-U40": "Y600-U40", "HUAWEI Y600D-C00": "Y600D-C00", "HUAWEI Y610-U00": "Y610", "HUAWEI Y618-T00": "Y618", "Kavak Y625-U03": "Y625-U03", "HUAWEI Y625-U13": "Y625-U13", "HUAWEI Y625-U21": "Y625-U21", "HUAWEI Y625-U32": "Y625-U32", "HUAWEI Y625-U43": "Y625-U43", "HUAWEI Y625-U51": "Y625-U51", "HUAWEI Y635-CL00": "Y635-CL00", "HUAWEI Y635-L02": "Y635-L02", "HUAWEI Y635-L03": "Y635-L03", "HUAWEI Y635-TL00": "Y635-TL00", "CAM-L03": "Y6II", "CAM-L21": "Y6II", "CAM-L23": "Y6II", "CAM-U22": "Y6II", "HUAWEI CAM-L03": "Y6II", "HUAWEI CAM-L21": "Y6II", "HUAWEI CAM-L23": "Y6II", "HUAWEI CAM-U22": "Y6II", "CAM-L32": "Y6II", "HUAWEI LYO-L03": "Y6ⅡCompact", "TRT-L21A": "Y7", "TRT-L53": "Y7", "TRT-LX1": "Y7", "TRT-LX2": "Y7", "TRT-LX3": "Y7", "Orinoquia Gran Roraima S7-702u": "Youth", "H1623": "ascend-5w", "KIW-L22": "honor 5X", "KIW-L23": "honor 5X", "KIW-L24": "honor 5X", "DLI-L42": "honor 6A Pro", "DIG-L21HN": "honor 6C", "JMM-L22": "honor 6C Pro", "BLN-L21": "honor 6x", "BLN-L22": "honor 6x", "HWV31": "huawei nova 2", "204HW": "hw204HW", "HUAWEI M881": "m881", "HUAWEI CAN-L01": "nova", "HUAWEI CAN-L02": "nova", "HUAWEI CAN-L03": "nova", "HUAWEI CAN-L11": "nova", "HUAWEI CAN-L12": "nova", "HUAWEI CAN-L13": "nova", "HUAWEI CAZ-AL10": "nova", "HUAWEI CAZ-AL00": "nova", "HUAWEI CAZ-TL10": "nova", "HUAWEI CAZ-TL20": "nova", "PIC-AL00": "nova 2", "PIC-TL00": "nova 2", "BAC-AL00": "nova 2 Plus", "BAC-L01": "nova 2 Plus", "BAC-L03": "nova 2 Plus", "BAC-L23": "nova 2 Plus", "BAC-TL00": "nova 2 Plus", "RNE-L02": "nova 2i", "RNE-L22": "nova 2i", "HWI-AL00": "nova 2s", "HWI-TL00": "nova 2s", "PAR-AL00": "nova 3", "PAR-LX1": "nova 3", "PAR-LX1M": "nova 3", "PAR-LX9": "nova 3", "PAR-TL00": "nova 3", "PAR-TL20": "nova 3", "ANE-AL00": "nova 3e", "ANE-TL00": "nova 3e", "INE-AL00": "nova 3i", "INE-TL00": "nova 3i", "PRA-LX2": "nova lite", "PRA-LX3": "nova lite", "HUAWEI MLA-L01": "nova plus", "HUAWEI MLA-L02": "nova plus", "HUAWEI MLA-L03": "nova plus", "HUAWEI MLA-L11": "nova plus", "HUAWEI MLA-L12": "nova plus", "HUAWEI MLA-L13": "nova plus", "MLA-L01": "nova plus", "MLA-L02": "nova plus", "MLA-L03": "nova plus", "MLA-L11": "nova plus", "MLA-L12": "nova plus", "MLA-L13": "nova plus", "WAS-AL00": "nova 青春版本", "WAS-TL10": "nova 青春版本", "MediaPad T1 8.0": "t1_8p0", "S8-701u": "t1_8p0", "S8-701w": "t1_8p0", "HUAWEI MediaPad T1 8.0 4G": "t1_8p0lte", "Honor T1 8.0": "t1_8p0lte", "MediaPad T1 8.0 Pro": "t1_8p0lte", "S8-821w": "t1_8p0lte", "HUAWEI VNS-DL00": "华为G9青春版", "HUAWEI VNS-TL00": "华为G9青春版", "BZT-AL00": "华为平板 C5", "BZT-AL10": "华为平板 C5", "BZT-W09": "华为平板 C5", "MON-AL19": "华为平板 C5", "MON-AL19B": "华为平板 C5", "MON-W19": "华为平板 C5", "BAH2-AL00": "华为平板 M5 青春版", "BAH2-AL10": "华为平板 M5 青春版", "BAH2-W09": "华为平板 M5 青春版", "BZK-L00": "华为平板T3 8行业专享版", "BZK-W00": "华为平板T3 8行业专享版", "PLE-701L": "华为揽阅M2青春版7.0", "PLE-703L": "华为揽阅M2青春版7.0", "DRA-AL00": "华为畅享 8e 青春", "DRA-TL00": "华为畅享 8e 青春", "NCE-AL00": "华为畅享6", "NCE-AL10": "华为畅享6", "NCE-TL10": "华为畅享6", "DIG-AL00": "华为畅享6S", "DIG-TL10": "华为畅享6S", "SLA-AL00": "华为畅享7", "SLA-TL10": "华为畅享7", "FIG-AL00": "华为畅享7S", "FIG-AL10": "华为畅享7S", "FIG-TL00": "华为畅享7S", "FIG-TL10": "华为畅享7S", "LDN-AL00": "华为畅享8", "LDN-AL10": "华为畅享8", "LDN-AL20": "华为畅享8", "LDN-TL00": "华为畅享8", "LDN-TL10": "华为畅享8", "LDN-TL20": "华为畅享8", "FLA-AL00": "华为畅享8 Plus", "FLA-AL10": "华为畅享8 Plus", "FLA-AL20": "华为畅享8 Plus", "FLA-TL00": "华为畅享8 Plus", "FLA-TL10": "华为畅享8 Plus", "ATU-AL10": "华为畅享8e", "ATU-TL10": "华为畅享8e", "JMM-AL00": "荣耀 V9 play", "JMM-AL10": "荣耀 V9 play", "JMM-TL00": "荣耀 V9 play", "JMM-TL10": "荣耀 V9 play", "KIW-AL10": "荣耀5X", "KIW-AL20": "荣耀5X", "KIW-CL00": "荣耀5X", "KIW-TL00": "荣耀5X", "KIW-UL00": "荣耀5X", "PRA-AL00": "荣耀8青春版", "PRA-AL00X": "荣耀8青春版", "PRA-TL10": "荣耀8青春版", "LLD-AL20": "荣耀9i", "LLD-AL30": "荣耀9i", "LLD-AL00": "荣耀9青春版", "LLD-AL10": "荣耀9青春版", "LLD-TL10": "荣耀9青春版", "EDI-AL10": "荣耀Note8", "EDI-DL00": "荣耀Note8", "TRT-AL00": "荣耀畅享7 Plus", "TRT-AL00A": "荣耀畅享7 Plus", "TRT-TL10": "荣耀畅享7 Plus", "TRT-TL10A": "荣耀畅享7 Plus", "BLN-AL10": "荣耀畅玩 6X", "BLN-AL20": "荣耀畅玩 6X", "BLN-AL30": "荣耀畅玩 6X", "BLN-AL40": "荣耀畅玩 6X", "BLN-TL00": "荣耀畅玩 6X", "BLN-TL10": "荣耀畅玩 6X", "CHM-TL00": "荣耀畅玩4C", "CHM-TL00H": "荣耀畅玩4C", "CHM-UL00": "荣耀畅玩4C", "CHE-TL00": "荣耀畅玩4X", "CHE-TL00H": "荣耀畅玩4X", "CAM-TL00": "荣耀畅玩5A", "CAM-TL00H": "荣耀畅玩5A", "CAM-UL00": "荣耀畅玩5A", "CAM-AL00": "荣耀畅玩5A", "CAM-CL00": "荣耀畅玩5A", "NEM-AL10": "荣耀畅玩5C", "NEM-TL00": "荣耀畅玩5C", "NEM-TL00H": "荣耀畅玩5C", "NEM-UL10": "荣耀畅玩5C", "MYA-AL10": "荣耀畅玩6", "MYA-TL10": "荣耀畅玩6", "DLI-AL10": "荣耀畅玩6A", "DUA-TL00": "荣耀畅玩7", "BND-AL00": "荣耀畅玩7X", "BND-AL10": "荣耀畅玩7X", "BND-TL10": "荣耀畅玩7X", "BZA-L00": "荣耀畅玩平板2 9.6", "BZA-W00": "荣耀畅玩平板2 9.6", "HUAWEI RIO-AL00": "麦芒4", "HUAWEI MLA-AL00": "麦芒5", "HUAWEI MLA-AL10": "麦芒5", "MLA-AL00": "麦芒5", "MLA-AL10": "麦芒5", "Hurricane_Bolt": "Bolt", "HURRICANE_GIGA": "Giga", "Swirl": "SWIRL", "VIBE": "Vibe", "HURRICANE VORTEX": "Vortex", "A26062K": "A26062k", "TCC893X_EVM": "CAR AVN SYSTEM", "A25024L": "Eternity A24", "G25022K": "Eternity G22", "G25523K": "Eternity G23", "G25524K": "Eternity G24", "G24027K": "Eternity G27", "W25042L": "Eternity W42", "W25544L": "Eternity W44", "HT1002W16": "Hyundai Koral 10W", "HT1003X16": "Hyundai Koral 10X", "HT0703K16": "Hyundai Koral 7M3X", "Seoul S8": "Seoul_S8", "Ultra_Vision_Plus": "Ultra Vision Plus", "BU01": "Buzz BU01", "Pryme 01": "Pryme01", "ST01": "Storm ST01", "INOI_3_LITE": "INOI 3 LITE", "INOI_6_Lite": "INOI_6_LITE", "IUNI N1": "N1", "1170TPC": "IVIEW", "730TPC": "Retailer Stores", "i700": "SupraPad i700", "i785Q": "SupraPad i785Q", "Ice-Phone Mini": "Mini", "NTMC17": "Portal_10i", "IKU i3": "I3", "i1": "IKU_i1", "IKU K3": "K3", "iKU T1": "T1", "X3 PRO SLIM": "X3_PRO_SLIM", "C001": "Ipanema", "B001": "Rio", "Infinity-10.1-v2": "10.1-v2", "Infinity-10.1-v3": "10.1-v3", "Infinix X510": "Infinix", "Infinix HOT 3 Pro": "HOT 3", "Infinix-X554": "HOT 3", "Infinix HOT 3 LTE": "HOT 3 LTE", "Infinix HOT 4": "X557F1", "Infinix HOT4 LTE": "HOT 4", "Infinix X557": "HOT 4", "Infinix HOT 4 Lite": "HOT 4 Lite", "Infinix HOT 4 Pro": "Hot 4 Pro", "Infinix_X556_LTE": "HOT 4 PRO", "Infinix X606": "HOT 6", "Infinix X606B": "HOT 6", "Infinix X606C": "HOT 6", "Infinix X606D": "HOT 6", "Infinix X608": "HOT 6 Pro", "Infinix-X551": "HOT NOTE", "Infinix X573": "HOT S3", "Infinix X573S": "HOT S3", "Infinix X573B": "HOT S3", "Infinix X559C": "HOT5", "Infinix X559F": "HOT5", "Infinix X559": "HOT5 Lite", "Infinix NOTE 3": "NOTE 3", "Infinix NOTE 3 Pro": "NOTE 3 Pro", "Infinix_X601_LTE": "NOTE 3 Pro", "Infinix X572": "X572", "Infinix X572-LTE": "X572", "Infinix X571": "NOTE 4 Pro", "Infinix X571-LTE": "NOTE 4 Pro", "Infinix X604": "Note 5", "Infinix X604B": "Note 5", "Infinix X454": "RACE Blot2", "Infinix X455": "RACE Bolt 3", "Infinix S2": "S2", "Infinix S2 Pro": "S2", "Infinix X511": "SURF 2", "Infinix X5515": "Smart 2", "Infinix X5515F": "Smart 2", "Infinix X5515I": "Smart 2", "Infinix X5514D": "Smart 2 Pro", "Infinix X405": "X405", "Infinix X505": "X505", "Infinix HOT S": "X521E1", "Infinix-X521": "X521G1", "Infinix-X521-LTE": "X521", "Infinix_X521": "X521G1", "Infinix_X521_LTE": "X521", "Infinix-X521_LTE": "X521G1", "Infinix-X521S": "X521S", "Infinix_X521S": "X521S", "INFINIX-X551": "X551", "Infinix Zero 3": "X552-F1", "Infinix-X552": "X552-F1", "Infinix Zero 4": "Zero 4", "INFINIX-X600": "X600", "Infinix-X600": "X600", "Infinix-X600-LTE": "X600", "Infinix X509": "Zero 2", "Infinix Zero 4 Plus": "Zero 4 Plus", "Infinix X603": "Zero 5 Pro", "Infinix X603-LTE": "Zero 5 Pro", "InFocus M505": "A1S", "IF195a": "Big Tab", "IF236a": "Big Tab", "C2107": "C7", "CS180": "CS1 8.0", "TSP": "Epic 1", "IF9035": "MADA", "IF9003": "Sharp A Click", "IF9031": "InFocus M7S", "InFocus M2": "M2", "InFocus M2PLUS": "M2+", "InFocus M260": "M260", "InFocus M2_3G": "M2_3G", "InFocus M310": "M310", "InFocus M320": "M320", "InFocus M320e": "M320e", "InFocus M320m": "M320m", "InFocus M320u": "M320u", "InFocus M330": "M330", "InFocus M350": "M350", "InFocus M415": "M415", "InFocus M425": "M425", "InFocus M430": "M430", "InFocus M460": "M460", "InFocus M500": "M500", "InFocus M510t": "M510t", "M510": "M511", "InFocus M512": "M512", "InFocus M530": "M530", "InFocus M535": "M535_00WW", "InFocus M550": "M550", "InFocus M550 3D": "M550 3D", "InFocus M560": "M560", "IF9002": "M5s", "InFocus M680": "M680", "InFocus M808": "M808", "InFocus M808i": "M808i", "InFocus M810": "M810", "InFocus M810t": "M810t", "InFocus M812": "M812", "InFocus M812A": "M812A", "InFocus M812i": "M812i", "IF9008": "Vision 3 Lite", "IF9029": "Vision 3 Pro", "XT_50IP600": "XT-50IP600", "IngenicoAxium": "AXIUM D7", "IMS-M70-V02": "Moby-M70", "Inhon_V6": "V6", "InnJoo_3": "3", "Fire_5_LTE": "Elite Dual", "Halo 5 3G": "Halo 5 3 G", "Halo_4_mini_LTE": "Halo4 mini LTE", "Max3_LTE": "Max3 LTE", "NS-15T8LTE": "FLEX 8’’ LTE Android Tablet", "NS-14T004": "Flex 10.1", "NS-15AT08": "Flex 8\"", "NS-P16AT785HD": "MID7802RA", "BT230": "Etisalat E-20", "INTEX AQUA LIONS N1": "INTEX AQUA LIONS N1", "AZ210A": "Orange San Diego", "AZ210B": "Orange avec Intel Inside", "Xolo_X500": "Xolo X500", "BT210": "Yolo", "INTEX AQUA 4G MINI": "Aqua 4G mini", "INTEX AQUA CRYSTAL": "AQUA CRYSTAL", "INTEX AQUA CRYSTAL+": "AQUA CRYSTAL+", "INTEX AQUA LIONS 2": "Aqua Lions 2", "INTEX AQUA LIONS T1 LITE": "AQUA LIONS T1 LITE", "INTEX AQUA TREND LITE": "AQUA TREND LITE", "INTEX AQUA YOUNG 4G": "AQUA YOUNG 4G", "INTEX AQUA ZENITH": "AQUA ZENITH", "INTEX_AQUA_4.0_4G": "AQUA_4.0_4G", "INTEX AQUA S3": "INTEX_AQUA_S3", "INTEX AQUA 4.0 3G": "Aqua 4.0 3G", "INTEX AQUA 5.5 VR+": "Aqua 5.5 VR+", "INTEX AQUA A4": "Aqua A4", "INTEX AQUA A4 PLUS": "Aqua A4+", "INTEX AQUA JEWEL 2": "Aqua Jewel 2", "IM0318ND": "Aqua Lions 3", "INTEX AQUA LIONS 3": "INDIE 5", "INTEX AQUA POWER IV": "Aqua Power IV", "Aqua_Ring": "Aqua Ring", "Intex Aqua Strong 5.1+": "Aqua Strong 5.1+", "Intex Aqua Supreme+": "Aqua Supreme+", "INTEX AQUA LIONS 4G": "Aqua_Lions_4G", "Aqua Q8": "Aqua_Q8", "INTEX CLOUD AX1": "Cloud AX1", "Intex_Cloud_Style_4G": "Cloud style 4G", "Cloud Q11 4G": "Cloud_Q11_4G", "INTEX ELYT E1": "ELYT E1", "INTEX ELYT E7": "ELYT E7", "Intex Elite E1": "Elite E1", "INTEX AQUA LIONS X1": "INDIE 15", "INTEX IM0418ND": "INDIE 15", "INTEX AQUA FulVU e5": "INFIE 33", "INTEX IP0518ND": "INFIE 33", "INTEX AQUA LIONS T1": "INTEX  AQUA Lions T1", "INTEX AQUA SELFIE": "INTEX Aqua Selfie", "INTEX AQUA LIONS X1+": "STAARi 10", "INTEX IP0218ND": "STAARi 10", "INTEX ELYT E6": "STAARi 12", "INTEX ELYT DUAL": "T1 Plus", "INTEX IM0118ND": "T1 Plus", "INTEX i1": "i1", "MEGA2": "MEGA", "TZ175": "IRBIS TZ175", "TZ176": "IRBIS TZ176", "TZ178": "IRBIS TZ178", "TZ198": "IRBIS TZ198", "TZ737": "IRBIS TZ737", "TZ747": "IRBIS TZ747", "TZ752": "IRBIS TZ752", "TZ753": "IRBIS TZ753", "NEXT_P": "NEXT P", "VOX 4s": "VOX  4s", "VOX Energy": "VOX  Energy", "VOX STEEL Plus": "VOX  STEEL Plus", "IS520_1": "IS520.1", "itel A11": "A11", "itel A12": "A12", "itel A13": "A13", "itel A13Plus": "A13 Plus", "itel A15": "A15", "itel A21": "A21", "itel A22": "A22", "itel A31Plus": "A31 Plus", "itel A32F": "A32F", "itel A41": "A41", "itel A41 Plus": "A41 Plus", "itel A43": "A43", "itel A44": "A44", "itel A44 Pro": "A44 Pro", "itel A51": "A51", "itel A52B": "A52B", "itel A62": "A62", "Spice F311": "F311", "itel P11": "P11", "itel P12": "P12", "itel P13": "P13", "itel P13 Plus": "P13 Plus", "itel P31": "P31", "itel P32": "P32", "itel P51": "P51", "itel Prime 4": "Prime 4", "itel S11": "S11", "itel S11 Plus": "S11 Plus", "itel S11Plus": "S11 Plus", "itel S11 Pro": "S11 Pro", "itel S11X": "S11X", "itel S13": "S13", "itel S21": "S21", "itel S31": "S31", "itel S32": "S32", "itel S41": "S41", "itel S42": "S42", "itel it1355": "it1355", "itel it1355M": "it1355M", "itel it1407": "it1407", "itel it1408": "it1408", "itel it1409": "it1409", "itel it1460": "it1460", "itel it1460 Pro": "it1460", "itel_it1505": "it1505", "itel it1506": "it1506", "itel it1507": "it1507", "itel it1508": "it1508 Plus", "itel it1508 GPS": "it1508", "itel it1508 Plus": "it1508 Plus", "itel it1513": "it1513", "itel it1516 Plus": "it1516 Plus", "itel it1518": "it1518", "itel-it1520": "it1520", "itel_it1550": "it1550", "itel it1551": "it1551", "itel-it1553": "it1553", "itel it1556": "it1556", "itel it1556 Plus": "it1556 Plus", "itel it1556 plus": "it1556 Plus", "itel it1655": "it1655", "itel it1655S": "it1655S", "itel it1702": "it1702", "itel it1703": "it1703", "JLab PRO-7": "PRO-7", "CASEBOOK_3": "TF10EA2", "DM65UXR": "DM65UXR\\\\DM65USR\\\\DM85UXR", "J20": "JVC J20", "H460": "H460B01", "JIMI_KNC4": "KN C4", "Joy": "Jinga Joy", "Optim4G": "Optim 4G", "Start3G": "Start 3G", "Touch4G": "Touch 4G", "COSMO_L707": "COSMO L707", "COSMO L808": "COSMO_L808", "FREEDOM C105": "FREEDOM C100", "FREEDOM_M303": "Freedom M303", "GINI_Tab_V7": "GINI Tab V7", "Just5": "Konrow", "MD-02P": "Mode1 MD-02P", "K-Lite F1+4G": "F1+4G", "K-LITE_NEXT_M1": "K-LITE NEXT M1", "K-Lite TAB X": "KLITE_TAB_Z", "K-Lite TAB Z": "TAB Z", "K-Touch 920": "K-Touch920", "K-Touch K3": "K3", "K-Touch L930i": "L930i", "K-Touch M2s": "M2s", "K-Touch Tou ch 2c": "Touch 2C", "KAAN_A1": "A1", "Trooper_X35": "TROOPER X3.5", "Trooper_X40": "TROOPER X4.0", "Trooper_X55": "TROOPER X5.5", "KAZAM TV 45": "TV 4.5", "KAZAM Thunder 345": "Thunder 345", "KAZAM Thunder 345 LTE": "Thunder 345 LTE", "Thunder3 45 LTE": "Thunder 345 LTE", "KAZAM Thunder 345L": "Thunder 345L", "KAZAM Thunder 350L": "Thunder 350L", "KAZAM Thunder 550": "Thunder 550", "KAZAM Thunder 550L": "Thunder 550L", "KAZAM THUNDER2 45L": "Thunder2 45L", "KAZAM Thunder2 50": "Thunder2 50", "KAZAM Tornado 350": "Tornado 350", "KAZAM Tornado 455L": "Tornado 455L", "KAZAM Tornado2 50": "Tornado2 50", "KAZAM Trooper 440L": "Trooper 440L", "KAZAM Trooper 445L": "Trooper 445L", "KAZAM Trooper 450": "Trooper 450", "KAZAM_Trooper_450L": "Trooper 450L", "KAZAM Trooper 451": "Trooper 451", "KAZAM Trooper 455": "Trooper 455", "KAZAM Trooper 540": "Trooper 540", "KAZAM Trooper 550L": "Trooper 550L", "KAZAM Trooper 551": "Trooper 551", "KAZAM Trooper 555": "Trooper 555", "KAZAM Trooper 650": "Trooper 650", "KAZAM Trooper 650 4G": "Trooper 650 4G", "KAZAM Trooper2 40": "Trooper2 40", "KAZAM Trooper2 50": "Trooper2 50", "Kazam Trooper2 60": "Trooper2 60", "KurioPhone": "Kurio Phone", "C14100": "Kurio Tab - Extrem", "01016": "TAB3-Premium-XTREME3", "01516": "TAB3-Premium-XTREME3", "C02AS": "CablePlus STB", "C02BB1": "Power Up Unit", "SMARTTVBOX": "SmartTVBox", "KEMPLER_TV": "KEMPLER TV", "KM-E100": "TAKE SUIT", "K4-02 4G": "Klic", "KAP11000": "SmartVision2", "A9 Indian": "A9_Indian", "Aura 4G": "Aura  4G", "Aura_Power": "Aura Power", "Aura Power 4G Plus": "Aura Power 4G", "Aura Sleek Plus": "Aura Seek Plus", "K9 VIRAAT 4G": "K9 Viraat 4G", "K9 Music 4G": "Karbonn K9 Music 4G", "Karbonn Yuva 2": "Karbonn Yuva2", "Alumini_3_Plus": "Alumini 3 Plus", "KEMPLER_8": "KEMPLER 8", "Elegance_4_0_black": "Elegance 4.0 black", "Elegance_5_1": "Elegance 5.1", "ELEGANCE_5_1_PRO": "Elegance 5.1 Pro", "Elegance_5_5": "Elegance 5.5", "Elegance_5_5_Pro": "Elegance 5.5 Pro", "KL3838": "7588AN", "KLIPAD_KL600": "KL600", "A1040M": "KLIPAD_A1040M", "KL4888": "KLIPAD_KL4888", "KLIPAD_PRO_I746": "PRO_I746", "KLIPAD_SMART_D791": "SMART_D791", "KLIPAD_SMART_I745": "SMART_I745", "KLIPAD_V355": "V355", "KLIPAD_V355B": "V355B", "arc 10HD": "Arc 10HD", "arc 7": "Arc 7", "arc 7HD": "Arc 7HD", "Kogan Agora 6Plus": "Agora 6 Plus", "Agora 8 Plus": "Kogan Agora 8 Plus", "KONROW_701X": "KONROW", "PRIMO": "Primo", "Kruger&Matz Drive 5": "DRIVE 5", "KM0701_1": "EAGLE 701", "KM0804_1": "EAGLE 804", "KM0805_1": "EAGLE 805", "FLOW_5": "FLOW 5", "FLOW5PLUS": "FLOW 5+", "Kr\\xc3\\xbcger&Matz _LIVE5_KM0450": "LIVE 5", "MOVE_7": "MOVE 7", "MOVE_8": "MOVE8", "Ambition": "Kult Ambition", "Beyond": "Kult Beyond", "S2": "Android One S2", "KYV32": "BASIO", "KYV43": "BASIO 3", "E6782": "Brigadier", "ISW11K": "DIGNO", "KYL22": "DIGNO", "WX04K": "DIGNO Dual", "KYV36": "DIGNO rafre", "202K": "DIGNO R", "KYL21": "DIGNO S", "302KC": "DIGNO T", "KYV42_u": "DIGNO V", "KYV40U": "DIGNO W", "KC-S702": "DURA FORCE PRO", "KYOCERA-E6560": "DuraForce", "E6560C": "DuraForce", "E6560L": "DuraForce", "E6560T": "DuraForce", "USCC-E6762": "DuraForce", "KYOCERA-E6820": "DuraForce PRO", "E6820TM": "DuraForce PRO", "E6830": "DuraForce PRO", "E6833": "Xperia Z5 Premium Dual", "E6810": "DuraForce PRO with Sapphire Shield", "KYOCERA-E6790": "DuraForce XD", "E6790TM": "DuraForce XD", "E6782L": "DuraScout", "KSP8000": "Echo", "M9300": "Echo", "101K": "HONEY BEE", "201K": "Honeybee Touch", "C5170": "Hydro", "KYOCERA-C6745": "Hydro AIR", "C5215": "Hydro EDGE", "C6750": "Hydro Elite", "C6730": "Hydro ICON", "C6530": "Hydro LIFE", "C6530N": "Hydro LIFE", "Hydro": "Hydro PLUS", "Hydro_PLUS": "Hydro PLUS", "C6743": "Hydro REACH", "KYOCERA-C6742A": "Hydro SHORE", "C6725": "Hydro VIBE", "C6742": "Hydro VIEW", "KYOCERA-C6742": "Hydro VIEW", "C6740": "Hydro WAVE", "C6740N": "Hydro WAVE", "C6522": "Hydro XTRM", "C6522N": "Hydro XTRM", "USCC-C6721": "Hydro XTRM", "KYV33": "INFOBAR A03", "KCP01K": "LUCE", "CD8100": "LifeWatch Universal Gateway", "C5120": "Milano", "C5121": "Milano", "KYV42": "Qua phone", "KYV37": "Qua phone (KYV37)", "KYV44": "Qua phone QZ", "KYV44_u": "Qua phone QZ", "KYT33": "Qua tab QZ10", "KYT32": "Qua tab QZ8", "C5155": "Rise", "KC-S301AE": "S301", "S4-KC": "S4", "SZJ-JS201": "SZJ201", "KC-100S": "TORQUE", "SKT01": "TORQUE", "KYY24": "TORQUE G01", "KYV35": "TORQUE G02", "KYV41": "TORQUE G03", "KC-S701": "TORQUE(KC-S701)", "E6715": "TorqueXT", "KYY21": "URBANO L01", "KYY22": "URBANO L02", "KYY23": "URBANO L03", "KYV31": "URBANO V01", "KYV34": "URBANO V02", "KYV38": "URBANO V03", "X3-KC": "X3", "KYL23": "miraie", "KYV39": "miraie f", "KYV40": "rafre", "Zio": "zio", "KA-E410W": "All&G PAD", "LG-FL40L": "070 touch", "10sm3tb": "10SM3TB", "LG-F520L": "AKA", "LG-F520S": "AKA", "LG-H788": "LG AKA", "AS740": "Ally", "Aloha": "Ally", "US740": "Ally", "LG Google TV": "Android TV", "LG Android TV V4": "GA7800", "LG Google TV G3": "Android TV G3", "LG Google TV G3 KR": "Android TV", "LGT02": "B6", "VS890 4G": "Enact", "LG-P870": "Optimus  LTE", "GW620": "Eve", "LG GW620": "Eve", "LG GW620F": "Eve", "LG GW620R": "Eve", "LG GW620g": "Eve", "LG KH5200": "Eve", "LG-GW620": "Eve", "LG-KH5200": "Eve", "LG-D390": "F60", "LG-D390AR": "F60", "LG-D392": "F60", "LG-D390n": "F60", "LG-D393": "F60", "LGMS395": "F60", "LGLS660": "F60", "VS810PP": "F60", "LGL31L": "F70", "LG-M153": "Fortune", "LG-M154": "Fortune", "LM-X210CM": "Fortune 2", "LM-X210CMR": "Fortune 2", "LG-X760": "G PADⅢ 10.1", "LG-X760E": "G PADⅢ 10.1", "LG-X760W": "G PADⅢ 10.1", "LG-V700": "G Pad 10.1", "LG-V700WJ": "G Pad 10.1", "LG-V700n": "G Pad 10.1", "LG-VK700": "G Pad 10.1 LTE", "VK700": "G Pad 10.1 LTE", "LG-V400": "Gpad 7.0", "LG-V400S1": "G Pad 7.0", "LG-V400Y1": "G Pad 7.0", "LG-V400Y7": "G Pad 7.0", "LG-V410": "G Pad 7.0 LTE", "LG-V411": "G Pad 7.0 LTE", "LGUK410": "G Pad 7.0 LTE", "AK815": "G Pad 8+", "LG-V480": "G pad 8.0", "LG-V498": "G Pad II 8.0", "LG-V498S1": "G Pad II 8.0", "LG-V498S2": "G Pad II 8.0", "LG-P451L": "G Pad III 8.0 Homeboy", "LGUK932": "G Pad Ⅱ 10.1", "LG-V935": "G Pad Ⅱ 10.1 FHD 4G LTE", "LG-V935T": "G Pad Ⅱ 10.1 FHD 4G LTE", "LG-D685": "G Pro Lite", "LG-D686": "G Pro Lite", "LG-D683": "G Pro Lite", "LG-D684": "G Pro Lite", "LG-D680": "G Pro Lite", "LG-D681": "G Pro Lite", "LG-D682": "G Pro Lite", "LG-D682TR": "G Pro Lite", "LG-F350K": "G Pro2", "LG-F350L": "G Pro2", "LG-F350S": "G Pro2", "LG-D838": "G Pro2", "LG-F560K": "G Stylo", "LG-D690": "G Vista", "VS880": "G Vista", "VS880PP": "G Vista", "LG-V490": "G pad 8.0 LTE", "LG-D620": "G2 MINI", "LG-D618": "G2 MINI", "LG-D610": "G2 MINI", "LG-D610AR": "G2 MINI", "LG-D610TR": "G2 MINI", "LG-D625": "G2 mini 4G LTE", "LG-D726": "G3 Beat", "LG-D728": "G3 Beat", "LG-D729": "G3 Beat", "LG-F470K": "G3 Beat", "LG-F470L": "G3 Beat", "LG-F470S": "G3 Beat", "LG-D722J": "G3 Beat", "LG-D727": "G3 Beat", "LG-D724": "G3 S", "LG-D723": "G3 S", "LG-D722": "G3 S", "LG-D722AR": "G3 S", "LG-D725PR": "G3 S", "LG-F490L": "G3 Screen", "LG-D690n": "G3 Stylus", "LG-D693": "G3 Stylus", "LG-D693AR": "G3 Stylus", "LG-D693TR": "G3 Stylus", "LG-D693n": "G3 Stylus", "LGLS885": "G3 Vigor", "LG-D725": "G3 Vigor", "LM-Q850K": "G6Fit", "LM-Q850L": "G6Fit", "LM-Q850S": "G6Fit", "VK410": "GPAD 7.0 LTE", "LG-F580L": "Gentle", "LG-F430L": "Gx2", "LG-V607L": "Homeboy2", "LG-F440L": "Ice cream Smart", "VS950 4G": "Intuition", "L-02K": "JOJO", "RS501": "K20", "LG-AS110": "K3 2017", "LGUS110": "K3 2017", "LG-M151": "K4", "LGL157BL": "K4 (2017)", "LGL57BL": "K4 (2017)", "LG-D335": "L Bello", "LG-D335E": "L Bello", "LG-D337": "L Bello", "LG-D290": "L Fino", "LG-D290AR": "L Fino", "LG-D295": "L Fino", "LG-D105": "L20", "LG-D100": "L20", "LG-D100AR": "L20", "LG-D107": "L20", "LG-D125": "L30 Sporty", "LG-D120": "L30 Sporty", "LG-D120AR": "L30 Sporty", "LG-X130g": "L45", "LG-X132": "L45", "LG-D221": "L50 Sporty", "LG-D227": "L50 Sporty", "LG-D213": "L50 Sporty", "LG-D213AR": "L50 Sporty", "LG-F590": "L5000", "LG-X135": "L60", "LG-X137": "L60", "LG-X140": "L60", "LG-X145": "L60", "LG-X147": "L60", "LG-D280": "L65", "LG-D285": "L65", "LG-P712": "LG Optimus L7 II", "LG-P714": "LG Optimus L7 II", "LG-P716": "Optimus L7II", "LG-D320": "L70", "LG-D320AR": "L70", "LG-D321": "L70", "LGAS323": "L70", "LGMS323": "L70", "LGLS620": "L70", "LG-D325": "L70", "LG-D329": "L70", "LG-D340f8": "L70", "LGL41C": "L70 CDMA", "LG-D380": "L80 Dual", "LG-D385": "L80 Dual", "LG-D370": "L80 Single", "LG-D373": "L80 Single", "LG-D375": "L80 Single", "LG-D375AR": "L80 Single", "LG-D400": "L90", "LG-D405": "L90", "LG-D415": "L90", "LG-D410": "L90 Dual", "LG-D331": "LBello", "LG-D331AR": "LBello", "LG-H778": "LG AKA", "LG-H779": "LG AKA", "LG-H788SG": "LG AKA", "LG-H788TR": "LG AKA", "LG-H788n": "LG AKA", "LGMS210": "LG Aristo", "LG-X150": "LG Bello II", "LG-X155": "LG Max", "LG-X165g": "LG Max", "LG-X170g": "LG Prime II", "LG-F620K": "LG Class", "LG-F620L": "LG Class", "LG-F620S": "LG Class", "LGL17AG": "LG Classic", "LGL18VC": "LG Classic", "LG-MS840": "LG Connect 4G", "LG-C729": "LG DOUBLEPLAY", "LGL21G": "LG Destiny", "LG-VS700": "LG Enlighten", "LG-VS700PP": "LG Enlighten", "LG-K373": "LG Escape 3", "LG-H443": "LG Escape2", "LG-H445": "LG Escape2", "LG-MS910": "LG Esteem", "LG-F570S": "LG F570S", "LG-D315": "LG F70", "LG-D315l": "LG F70", "LG-F370K": "LG F70", "LG-F370L": "LG F70", "LG-F370S": "LG F70", "LGL163BL": "LG Fiesta 2 LTE", "LGL164VL": "LG Fiesta 2 LTE", "LGL63BL": "LG Fiesta LTE", "LGL64VL": "LG Fiesta LTE", "LG-D950": "LG G Flex", "LG-D950G": "LG G Flex", "LG-D951": "LG G Flex", "LG-D955": "LG G Flex", "LG-D956": "LG G Flex", "LG-D958": "LG G Flex", "LG-D959": "LG G Flex", "LG-F340K": "LG G Flex", "LG-F340L": "LG G Flex", "LG-F340S": "LG G Flex", "LG-LS995": "LG G Flex", "LGL23": "LG G Flex", "LG-F510K": "LG G Flex2", "LG-F510L": "LG G Flex2", "LG-F510S": "LG G Flex2", "LG-H950": "LG G Flex2", "LG-H955": "LG G Flex2", "LG-H959": "LG G Flex2", "LGAS995": "LG G Flex2", "LGLS996": "LG G Flex2", "LGUS995": "LG G Flex2", "LGT01": "LG G Pad 8.0 L Edition", "LG-P490L": "LG G Pad 8.0 LTE", "LG-V500": "LG G Pad 8.3", "LG-V510": "LG G Pad 8.3 Google Play Edition", "VK810 4G": "LG G Pad 8.3 LTE", "LG-V507L": "LG G Pad 8.3 homeBoy", "LG-AK495": "LG G Pad F™ 8.0 2nd Gen", "LG-UK495": "LG G Pad F™ 8.0 2nd Gen", "LG-V495": "LG G Pad F 8.0", "LG-V496": "LG G Pad F 8.0", "LG-V499": "LG G Pad F 8.0", "LG-LK460": "LG G Pad F2 8.0", "LGLK430": "LG G Pad F7.0", "LG-V940": "LG G Pad II 10.1 FHD", "LG-V940n": "LG G Pad II 10.1 FHD", "LG-V497": "LG G Pad II 8.0LTE", "LG-P815L": "LG G Pad II 8.3", "LG-P755L": "LG G Pad III 10.1 FHD LTE", "LG-V755": "LG G Pad III 10.1 FHD LTE", "LG-V522": "LG G Pad III 8.0", "LG-V525": "LG G Pad III 8.0 FHD", "LG-V525S1": "LG G Pad III 8.0 FHD", "LG-V525S3": "LG G Pad III 8.0 FHD", "LG-V533": "LG G Pad IV 8.0", "LG-P530L": "LG G Pad IV 8.0 FHD LTE", "LG-V521": "LG G Pad X 8.0", "VK815": "LG G Pad X 8.3", "LG-V530": "LG G Pad X2 8.0 PLUS", "LGUK750": "LG G Pad X® II 10.1", "LG-V520": "LG G Pad™ X 8.0", "LG-H634": "LG G Stylo", "LGLS770": "LG G Stylo", "LG-H630D": "LG G Stylo", "LG-H630": "LG G Stylo", "LG-H631": "LG G Stylo", "LG-H631MX": "LG G Stylo", "LG-H635": "LG G Stylo", "LG-H635A": "LG G Stylo", "LG-H636": "LG G Stylo", "LGMS631": "LG G Stylo", "LG-D631": "LG G Vista", "LG-H740": "LG G Vista 2", "LG-D800": "LG G2", "LG-D801": "LG G2", "LG-D802": "LG G2", "LG-D802T": "LG G2", "LG-D802TR": "LG G2", "LG-D803": "LG G2", "LG-D805": "LG G2", "LG-D806": "LG G2", "LG-F320K": "LG G2", "LG-F320L": "LG G2", "LG-F320S": "LG G2", "LG-LS980": "LG G2", "VS980 4G": "LG G2", "AS985": "LG G3", "LG-AS990": "LG G3", "LG-D850": "LG G3", "LG-D851": "LG G3", "LG-D852": "LG G3", "LG-D852G": "LG G3", "LG-D855": "LG G3", "LG-D856": "LG G3", "LG-D857": "LG G3", "LG-D858": "LG G3", "LG-D858HK": "LG G3", "LG-D859": "LG G3", "LG-F400K": "LG G3", "LG-F400L": "LG G3", "LG-F400S": "LG G3", "LGL24": "LG G3", "LGLS990": "LG G3", "LGUS990": "LG G3", "LGV31": "LG G3", "VS985 4G": "LG G3", "LG-F410S": "LG G3 A", "LG-F460K": "LG G3 Cat.6", "LG-F460L": "LG G3 Cat.6", "LG-F460S": "LG G3 Cat.6", "AS986": "LG G4", "LG-AS811": "LG G4", "LG-AS991": "LG G4", "LG-F500K": "LG G4", "LG-F500L": "LG G4", "LG-F500S": "LG G4", "LG-H810": "LG G4", "LG-H811": "LG G4", "LG-H812": "LG G4", "LG-H815": "LG G4", "LG-H818": "LG G4", "LG-H819": "LG G4", "LGLS991": "LG G4", "LGUS991": "LG G4", "LGV32": "LG G4", "VS986": "LG G4", "LG-H736": "LG G4 Beat", "LG-H735": "LG G4 Beat", "LG-H540": "LG G4 Stylus", "LG-H542": "LG G4 Stylus", "LG-H731": "LG G4 vigor", "LG-H525": "LG G4c", "LG-H525n": "LG G4c", "LG-H734": "LG G4s", "LG-F700K": "LG G5", "LG-F700L": "LG G5", "LG-F700S": "LG G5", "LG-H820": "LG G5", "LG-H820PR": "LG G5", "LG-H830": "LG G5", "LG-H831": "LG G5", "LG-H850": "LG G5", "LG-H858": "LG G5", "LG-H860": "LG G5", "LG-H868": "LG G5", "LGAS992": "LG G5", "LGLS992": "LG G5", "LGUS992": "LG G5", "RS988": "LG G5", "VS987": "LG G5", "LG-H840": "LG G5 SE", "LG-H845": "LG G5 SE", "LG-H848": "LG G5 SE", "LG-AS993": "LG G6", "LG-H870": "LG G6", "LG-H870AR": "LG G6", "LG-H870DS": "LG G6", "LG-H870I": "LG G6", "LG-H870S": "LG G6", "LG-H871": "LG G6", "LG-H872": "LG G6", "LG-H872PR": "LG G6", "LG-H873": "LG G6", "LG-LS993": "LG G6", "LGM-G600K": "LG G6", "LGM-G600L": "LG G6", "LGM-G600S": "LG G6", "LGUS997": "LG G6", "VS988": "LG G6", "LG-G710": "LG G7 ThinQ", "LM-G710": "LG G7 ThinQ", "LM-G710N": "LG G7 ThinQ", "LM-G710VM": "LG G7 ThinQ", "LGL59BL": "LG GRACE™ LTE", "LG-F660L": "LG Gentle", "LG-V930": "LG Gpad X 10.1", "LG-F310L": "LG Gx", "LG-F310LR": "LG Gx", "LG-M257": "LG Harmony", "LG-H220": "LG Joy", "LG-H222": "LG Joy", "LG-H221": "LG Joy", "LG-H221AR": "LG Joy", "LG-K425": "LG K10", "LG-K428": "LG K10", "LGMS428": "LG K10", "LG-K420": "LG K10", "LG-F670K": "LG K10", "LG-F670L": "LG K10", "LG-F670S": "LG K10", "LG-K410": "LG K10", "LG-M257PR": "LG K10 (2017)", "LG-M250": "LG K10 (2017)", "LG-K420PR": "LG K10 LTE", "LG-K430": "LG K10 LTE", "LG-M320": "LG X500", "LM-X410(FN)": "LG K11", "LM-X410.F": "LG Premier Pro", "LM-X410.FN": "LG K11+", "LG-M255": "LG K20", "LG-TP260": "LG K20 Plus", "LGMP260": "LG K20 Plus", "VS501": "LG K20 V", "LGL48VL": "LG K3", "LGLS450": "LG K3", "LG-K100": "LG K3 LTE", "LM-X410UM": "LG K30", "LG-K120GT": "LG K4", "LG-K121": "LG K4", "VS425": "LG K4", "LG-M160": "LG K4", "LG-K120": "Spree", "LG-K130": "LG K4 LTE", "LG-X230": "LG K4/K7 (2017)", "LG-X230YK": "LG K4/K7 (2017)", "LG-X220": "LG K5", "LG-AS330": "LG K7", "LG-K330": "LG K7", "LGMS330": "LG K7", "LG-X210": "LG K7", "LG-M210": "LG K8", "LGAS375": "LG K8", "LGUS375": "LG K8", "RS500": "LG K8", "LG-K350": "LG K8 LTE", "LGUS215": "LG K8 (2017)", "LG-M200": "LG K8 (2017) Dual", "LG-X240": "LG K8 (2017)", "VS500": "LG K8 V", "VS500PP": "LG K8 V", "LM-X21(G)": "LG K8(2018)", "LM-X210": "LG K9", "LM-X210(G)": "LG K8(2018)", "LM-X212(G)": "LG K8(2018)", "LML211BL": "LG K8(2018)", "LML212VL": "LG K8(2018)", "LGL39C": "LG L39C", "LG-H345": "LG LEON™ LTE", "VS820": "LG Lancet", "LG-H320": "LG Leon", "LG-H324": "LG Leon", "LG-H326": "LG Leon TV", "LG-H340": "LG Leon 4G LTE", "LG-H340AR": "LG Leon 4G LTE", "LG-H340GT": "LG Leon 4G LTE", "LG-H343": "LG Leon 4G LTE", "LGMS345": "LG Leon 4G LTE", "LG-H342": "LG Leon 4G LTE", "LG-H340n": "LG Leon 4G LTE", "LGUS550": "LG Logos", "VS840 4G": "LG Lucid", "VS840PP": "LG Lucid", "VS870 4G": "LG Lucid 2", "VS876": "LG Lucid 3", "LG-K332": "LG M1", "LG-LS860": "LG Mach™", "LG-H500": "LG Magna", "LG-T540": "LG Magna", "LG-H502": "LG Magna", "LG-H520": "LG Magna LTE", "LG-X160": "LG Max", "LG-MS770": "LG Motion 4G", "LG-MS695": "LG OPTIMUS M+", "LGL75C": "LG OPTIMUS ZIP", "LG-P920": "Optimus 3D", "LG-P925g": "LG Optimus 3D", "LG-SU760": "Optimus 3D", "LG-VM696": "LG Optimus ELITE™", "LG-LS696": "LG Optimus Elite", "LG-D520": "LG Optimus F3Q", "LG-AS780": "LG Optimus F7", "LG-LG870": "LG Optimus F7", "LG-US780": "LG Optimus F7", "LG-E970": "LG Optimus G", "LG-E971": "LG Optimus G", "LG-E973": "LG Optimus G", "L-01E": "LG Optimus G", "LGL21": "LG Optimus G", "LG-E975": "LG Optimus G", "LG-E975K": "LG Optimus G", "LG-E975T": "LG Optimus G", "LG-E976": "LG Optimus G", "LG-E977": "LG Optimus G", "LG-E987": "LG Optimus G", "LG-F180K": "LG Optimus G", "LG-F180S": "LG Optimus G", "LG-F180L": "LG Optimus G", "LG-LS970": "LG Optimus G", "LG-E980": "LG Optimus G Pro", "LG-E980h": "LG Optimus G Pro", "LG-E981h": "LG Optimus G Pro", "LG-E986": "LG Optimus G Pro", "LG-E988": "LG Optimus G Pro", "LG-E989": "LG Optimus G Pro", "LG-F240K": "LG Optimus G Pro", "LG-F240S": "LG Optimus G Pro", "LG-F240L": "LG Optimus G Pro", "LG-E510": "Optimus Hub", "LG-E410": "LG Optimus L1II", "LG-E410B": "LG Optimus L1II", "LG-E410c": "LG Optimus L1II", "LG-E410f": "LG Optimus L1II", "LG-E410g": "LG Optimus L1II", "LG-E410i": "LG Optimus L1II", "LG-E411f": "LG Optimus L1II", "LG-E411g": "LG Optimus L1II", "LG-E415f": "LG Optimus L1II", "LG-E415g": "LG Optimus L1II", "LG-E420": "LG Optimus L1II", "LG-E420f": "LG Optimus L1II", "LG-E475f": "LG Optimus L1II", "LG-E400": "LG Optimus L3", "LG-E400R": "LG Optimus L3", "LG-E400b": "LG Optimus L3", "LG-E400f": "LG Optimus L3", "LG-E400g": "LG Optimus L3", "LG-L38C": "LG Optimus L3", "LGL35G": "LG Optimus L3", "LG-E405": "LG Optimus L3 Dual", "LG-E405f": "LG Optimus L3 Dual", "LG-E435": "LG Optimus L3 II", "LG-E435f": "LG Optimus L3 II", "LG-E435g": "LG Optimus L3 II", "LG-E435k": "LG Optimus L3 II", "LG-E425": "LG Optimus L3 II", "LG-E425c": "LG Optimus L3 II", "LG-E425f": "LG Optimus L3 II", "LG-E425g": "LG Optimus L3 II", "LG-E425j": "LG Optimus L3 II", "LG-E430": "LG Optimus L3 II", "LG-E431g": "LG Optimus L3 II", "LG-E440": "LG Optimus L4 II", "LG-E440f": "LG Optimus L4 II", "LG-E440g": "LG Optimus L4 II", "LG-E465f": "LG Optimus L4 II", "LG-E465g": "LG Optimus L4 II", "LG-E445": "LG Optimus L4 II Dual", "LG-E467f": "LG Optimus L4 II Dual", "LG-E470f": "LG Optimus L4 II Tri", "LG-E615": "LG Optimus L5 Dual", "LG-E615f": "LG Optimus L5 Dual", "LG-E455": "LG Optimus L5 II", "LG-E455f": "LG Optimus L5 II", "LG-E455g": "LG Optimus L5 II", "LG-E460": "LG Optimus L5 II", "LG-E460f": "LG Optimus L5 II", "LG-E450": "LG Optimus L5 II", "LG-E450B": "LG Optimus L5 II", "LG-E450f": "LG Optimus L5 II", "LG-E450g": "LG Optimus L5 II", "LG-E450j": "LG Optimus L5 II", "LG-E451g": "LG Optimus L5 II", "LG-P700": "LG Optimus L7", "LG-P705": "LG Optimus L7", "LG-P705f": "LG Optimus L7", "LG-P705g": "LG Optimus L7", "LG-P708g": "LG Optimus L7", "LG-T280": "LG Optimus L7", "LGL96G": "LG Optimus L7", "LG-P715": "LG Optimus L7II", "LG-P710": "LG Optimus L7 II", "LG-P713": "LG Optimus L7 II", "LG-P713GO": "LG Optimus L7 II", "LG-P713TR": "LG Optimus L7 II", "LG-D700": "LG Optimus L9", "LG-P760": "LG Optimus L9 (NFC)", "LG-P765": "LG Optimus L9", "LG-P768": "LG Optimus L9", "LG-P769": "LG Optimus L9", "LG-P778": "LG Optimus L9", "LGMS769": "LG Optimus L9", "LG-D605": "LG Optimus L9 II", "LG-AS840": "LG Optimus LTE Tag", "LG-F120K": "LG Optimus LTE Tag", "LG-F120L": "LG Optimus LTE Tag", "LG-F120S": "LG Optimus LTE Tag", "LG-F160K": "LG Optimus LTE2", "LG-F160S": "LG Optimus LTE2", "LG-F160L": "LG Optimus LTE2", "LG-F160LV": "LG Optimus LTE2", "LG-F260S": "LG Optimus LTE3", "LG-P500": "LG Optimus One", "LG-P500h": "LG Optimus One", "LG-P503": "LG Optimus One", "LG-P504": "LG Optimus One", "LG-P505": "LG Optimus One", "LG-P505CH": "LG Optimus One", "LG-P505R": "LG Optimus One", "LG-P506": "LG Optimus One", "LG-P509": "LG Optimus One", "LG-LW770": "LG Optimus Regard", "LG-AS730": "LG Optimus Select", "VS415PP": "LG Optimus Zone 2", "LG-P350": "LG Pecan", "LG-P350f": "LG Pecan", "LG-P350g": "LG Pecan", "LG-K371": "LG Phoenix 2", "LM-X210APM": "LG Phoenix 4", "LGL22C": "LG Power", "LM-X410(FG)": "LG Premier Pro", "LM-X410.FG": "LG Premier Pro", "LM-X410.FGN": "LG Premier Pro", "LML413DL": "LG Premier Pro", "LML414DL": "LG Premier Pro", "LG-X170fTV": "LG Prime II", "LG-H522": "LG Prime Plus 4G", "LG-M700": "LG Q6", "LG-M703": "LG Q6", "LG-US700": "LG Q6", "LGM-X600K": "LG Q6", "LGM-X600L": "LG Q6", "LGM-X600S": "LG Q6", "LM-Q610(FGN)": "LG Q7", "LM-Q610.FG": "LG Q7", "LM-Q610.FGN": "LG Q7", "LM-Q725K": "LG Q7+", "LM-Q725L": "LG Q7+", "LM-Q725S": "LG Q7+", "LG-X190": "LG RAY", "LGL43AL": "LG Rebel", "LGL44VL": "LG Rebel", "VS910 4G": "LG Revolution", "LGL33L": "LG SUNSET", "LGM-X100L": "LG Smart Folder", "LGM-X100S": "LG Smart Folder", "VS920 4G": "Spectrum", "LG-H420": "LG Spirit", "LG-H440n": "LG Spirit 4G LTE", "LG-H440": "LG Spirit LTE", "LG-H440AR": "LG Spirit LTE", "LG-K540": "LG Stylo 2", "LGL81AL": "LG Stylo 2", "LGL82VL": "LG Stylo 2", "LGLS775": "LG Stylo 2", "LG-K550": "LG Stylo 2 Plus", "LG-K557": "LG Stylo 2 Plus", "LGMS550": "LG Stylo 2 Plus", "LG-M470": "LG Stylo 3 Plus", "LG-M470F": "LG Stylo 3 Plus", "LG-TP450": "LG Stylo 3 Plus", "LGMP450": "LG Stylo 3 Plus", "LM-Q710(FGN)": "LG Stylo 4", "LM-Q710.FG": "QStylus", "LM-Q710.FGN": "QStylus Plus", "LML713DL": "LG Stylo 4", "LG-Q710AL": "LG Stylo 4", "LG-Q710PL": "LG Stylo 4", "LG-M430": "LG Stylo3", "LGL83BL": "LG Stylo3", "LGL84VL": "LG Stylo3", "LG-LS777": "LG Stylo3", "LG-F720K": "LG Stylus 2", "LG-F720L": "LG Stylus 2", "LG-F720S": "LG Stylus 2", "LG-K520": "LG Stylus2", "LG-K530": "LG Stylus2 4G", "LG-K535": "LG Stylus2 Plus", "LG-K535n": "LG Stylus2 Plus", "LG-M400": "LG Stylus3", "LG-P925": "Thrill 4G", "LGL51AL": "LG Treasure", "LGL52VL": "LG Treasure", "LGLS665": "LG Tribute 2™", "LGLS675": "LG Tribute 5", "LG-SP200": "LG Tribute Dynasty", "LG-F820L": "LG U", "LM-V350": "LG V35 ThinQ", "LM-V350N": "LG V35 ThinQ", "LG-LG730": "LG Venice", "LG-LS840": "LG Viper 4G LTE", "LG-H422": "LG Volt", "LGLS740": "LG Volt", "LG-H442": "LG Volt 4G", "LGLS751": "LG Volt II", "LG-F540K": "LG Volt LTE", "LG-F540L": "LG Volt LTE", "LG-F540S": "LG Volt LTE", "LG-F640S": "LG Volt S", "LG Watch Urbane": "LG Watch Urbane 2nd Edition LTE", "LG-H410": "LG Wine Smart", "LG-F610K": "LG Wine Smart Jazz", "LG-F610S": "LG Wine Smart Jazz", "LGK500J": "LG X Screen", "LG-F740L": "LG X Skin", "LG-K200": "LG X Style", "LGL53BL": "LG X Style", "LGL56VL": "LG X Style", "LGLS676": "LG X Style", "LG-US701": "LG X Venture", "LG-H700": "LG X Venture", "LG-M710": "LG X Venture", "LG-M710ds": "LG X Venture", "LG-F690L": "LG X cam", "LG-F690S": "LG X cam", "LG-K580": "LG X cam", "LG-K580Y": "LG X cam", "LG-M322": "LG X charge", "LG-M327": "LG X charge", "LM-X510(FG)": "LG X charge", "LM-X510.FG": "LG X charge", "LG-K240": "LG X max", "LG-K210": "LG X power", "LG-K212": "LG X power", "LG-K450": "LG X power", "LGUS610": "LG X power", "LG-F750K": "LG X power", "LG-K220": "LG X power", "LGLS755": "LG X power", "LG-M320G": "LG X power2", "LM-X510WM": "LG X power2", "LG-F650K": "LG X screen", "LG-F650L": "LG X screen", "LG-F650S": "LG X screen", "LG-K500": "LG X screen", "LGS02": "LG X screen", "LG-K500n": "LG X screen", "LM-X210K": "LG X2", "LM-X210L": "LG X2", "LM-X210S": "LG X2", "LGM-K120K": "LG X300", "LGM-K120L": "LG X300", "LGM-K120S": "LG X300", "LGM-K121K": "LG X400", "LGM-K121L": "LG X400", "LGM-K121S": "LG X400", "LGM-X301K": "LG X400", "LGM-X301L": "LG X400", "LGM-X301S": "LG X400", "LGM-X401L": "LG X400", "LGM-X401S": "LG X400", "LG-F770S": "LG X5", "LM-X510L": "LG X5", "LGM-X320K": "LG X500", "LGM-X320L": "LG X500", "LGM-X320S": "LG X500", "LM-X510K": "LG X500", "LM-X510S": "LG X500", "LG-X180g": "LG ZONE", "LG-H650": "LG Zero", "L-05D": "LG optimus it L-05D", "L-05E": "LG optimus it L-05E", "AS876": "LG-AS876", "LG-E985": "LG-E985T", "L-07C": "Marquee", "LG-LG855": "Marquee", "LG-LS855": "Marquee", "LG-P970": "Optimus Black", "LG-E739": "My touch 4G", "LG-SU880": "Optimus EX", "LG-AS680": "Optimus 2", "LG-P990": "Optimus 2X", "LG-P990H": "Optimus 2X", "LG-P990h": "Optimus 2X", "LG-P990hN": "Optimus 2X", "LG-P999": "Optimus 2X", "LG-SU660": "Optimus 2X", "LG-P920h": "Optimus 3D", "LG-SU870": "Optimus 3D MAX", "LG-P720": "Optimus 3D MAX", "LG-P720h": "Optimus 3D MAX", "LG-P725": "Optimus 3D MAX", "LG-P880": "Optimus 4X HD", "LG-P880g": "Optimus 4X HD", "LG-LU6800": "Optimus Big", "LGL85C": "Optimus Black", "LG-KU5900": "Optimus Black", "LG-P970h": "Optimus Black", "LG-P970g": "Optimus Black", "LG-C550": "Optimus Chat", "LG-C555": "Optimus Chat", "LGL86C": "Optimus Core", "IS11LG": "Optimus EX", "LG-VS450PP": "Optimus Exceed 2", "LG-LS720": "Optimus F3", "LG-P655H": "Optimus F3", "LG-P655K": "Optimus F3", "LG-P659": "Optimus F3", "LG-P659H": "Optimus F3", "LGL25L": "Optimus F3", "LGMS659": "Optimus F3", "LG-P870h": "Optimus F5", "LG-P875": "Optimus F5", "LG-P875h": "Optimus F5", "AS870 4G": "Optimus F5", "LG-D500": "Optimus F6", "LG-D505": "Optimus F6", "LGMS500": "Optimus F6", "LGL34C": "Optimus Fuel", "L-04E": "Optimus G Pro", "LG-E975w": "Optimus GJ", "LG-F220K": "Optimus GK", "LG-C800": "Optimus Hub", "LG-C800G": "Optimus Hub", "LG-E510f": "Optimus Hub", "LG-E510g": "Optimus Hub", "LG-D160": "Optimus L40", "LG-D165": "Optimus L40", "LG-D165AR": "Optimus L40", "LG-D170": "Optimus L40", "LG-D175f": "Optimus L40", "LG-D180f": "Optimus L40", "LG-E610": "Optimus L5", "LG-E610v": "Optimus L5", "LG-E612": "Optimus L5", "LG-E612f": "Optimus L5", "LG-E612g": "Optimus L5", "LG-E617G": "Optimus L5", "LG-L40G": "Optimus L5", "L-02E": "Optimus LIFE", "L-01D": "Optimus LTE", "LG-SU640": "Optimus LTE", "LG-LU6200": "Optimus LTE", "LG-P936": "Optimus LTE", "LG-P930": "Optimus LTE", "LG-P935": "Optimus LTE", "LG-LU3000": "Optimus Mach", "LG-P690b": "Optimus Net", "LG-P690": "Optimus Spirit", "LGL45C": "Optimus Net", "LG-P698": "Optimus Net Dual", "LG-P698f": "Optimus Net Dual", "LG-KU3700": "Optimus One", "LG-LU3700": "Optimus One", "LG-SU370": "Optimus One", "LG-CX670": "Optimus One", "LG-LW690": "Optimus One", "LG-MS690": "Optimus One", "LG-US670": "Optimus One", "LS670": "Optimus One", "VM670": "Optimus One", "Vortex": "Optimus One", "thunderc": "Optimus One", "LG-LU8300": "Optimus PAD LTE", "L-06C": "Optimus Pad", "LG-V900": "Optimus Pad", "LG-V901": "Optimus Pad", "LG-V905R": "Optimus Pad", "LG-V909": "Optimus Pad", "LG-AS695": "Optimus Plus", "LG-C660": "Optimus Pro", "LG-C660R": "Optimus Pro", "LG-C660h": "Optimus Pro", "LGL55C": "Optimus Q", "LG-LU6500": "Optimus Q2", "LG-VM701": "Optimus Slider", "LG-E730": "Optimus Sol", "LG-E730f": "Optimus Sol", "LG-P690f": "Optimus Spirit", "LG-F100L": "Optimus Vu", "LG-F100S": "Optimus Vu", "L-06DJOJO": "Optimus Vu", "LG-P895": "Optimus Vu", "LG-P895qb": "Optimus Vu", "LG-F200K": "Optimus Vu2", "LG-F200S": "Optimus Vu2", "LG-F200L": "Optimus Vu2", "LG-F200LS": "Optimus Vu2", "L-06D": "Optimus Vu:", "SU950": "Optimus Z", "LG-VS410PP": "Optimus Zone", "L-04C": "Optimus chat", "L-02D": "PRADA 3.0", "LG-KU5400": "PRADA 3.0", "LG-LU5400": "PRADA 3.0", "LG-P940": "PRADA 3.0", "LG-P940h": "PRADA 3.0", "LG-SU540": "PRADA 3.0", "LG-P355": "PecanV", "LG-M150": "Phoenix 3", "LGL61AL": "Premier", "LGL62VL": "Premier", "LG-H970": "Q8", "LGM-X800K": "Q8", "LGM-X800L": "Q8", "LM-Q815L": "Q8", "LM-Q815S": "Q8", "LGV33": "Qua phone PX", "LGT31": "Qua tab PX", "LGT32": "Qua tab PZ", "LGL158VL": "Rebel 3", "LGL58VL": "Rebel 3", "LG-C710h": "Shine Plus with Google", "ref_SCTF": "Smart Dios V8700", "VS930 4G": "Spectrum 2", "LG-MS870": "Spirit 4G", "LG-US730": "Splendor", "402LG": "Spray", "VS835": "Stylo 2 V", "GT540": "Swift", "GT540GO": "Swift", "GT540R": "Swift", "GT540f": "Swift", "LG-F520K": "TBD", "LG-F600K": "V10", "LG-F600L": "V10", "LG-F600S": "V10", "LG-H900": "V10", "LG-H900PR": "V10", "LG-H901": "V10", "LG-H960": "V10", "LG-H961AN": "V10", "LG-H961N": "V10", "LG-H961S": "V10", "LG-H962": "V10", "LG-H968": "V10", "RS987": "V10", "VS990": "V10", "LG-F800K": "V20", "LG-F800L": "V20", "LG-F800S": "V20", "LG-H910": "V20", "LG-H910PR": "V20", "LG-H915": "V20", "LG-H918": "V20", "LG-H990": "V20", "LG-LS997": "V20", "LG-US996": "V20", "LGV34": "V20", "VS995": "V20", "L-01J": "V20 PRO", "LG-AS998": "V30", "LG-H930": "V30", "LG-H931": "V30", "LG-H932": "V30", "LG-H932PR": "V30", "LG-H933": "V30", "LG-LS998": "V30", "LG-US998": "V30", "LGM-V300K": "V30", "LGM-V300L": "V30", "LGM-V300S": "V30", "VS996": "V30", "L-01K": "V30+", "LGV35": "V30+", "LG-F300K": "VU3", "LG-F300L": "VU3", "LG-F300S": "VU3", "LG-V425": "WM-LG8200", "LGS01": "Wine Smart", "LG-D486": "Wine Smart", "LG-F480K": "Wine Smart", "LG-F480L": "Wine Smart", "LG-F480S": "Wine Smart", "LG-T480K": "Wine Smart 3G", "LG-T480S": "Wine Smart 3G", "LG-K600": "X Mach", "LG-SP320": "X charge", "LM-X410K": "X4", "LM-X415K": "X4", "LM-X410L": "X4+", "LM-X410S": "X4+", "LM-X415L": "X4+", "LM-X415S": "X4+", "LGL15G": "Y25", "LGL16C": "Y25", "LM-X210VPP": "ZONE4", "VS425PP": "Zone3", "TI320-DU": "TV G", "ST940I-UP": "U+ tv UHD", "LAP250U": "U+ tv woofer", "LAP255U": "U+ tv woofer 1.5", "S60UPI": "U+tv UHD2", "S60UPA": "U+tv soundbar", "DS2310-70LP": "DISNEY_Tablet_PC", "X10": "Irulu", "LINSAY F-7HD2CORE/F-7HD4CORE/F-10HD2CORE/F-10XHD4CORE": "F-7HD2CORE / F-7HD4CORE / F-10HD2CORE /F-10XHD4CORE", "LT C2200": "LT_C2200", "Luvo 001": "001", "LUVO 001L": "001L", "MID704DC": "MID704DC Tablet / Bitmore Tab770", "LAIQ Glam": "GLAM", "Lamborghini tablet": "SDIS1", "Land Rover Explore": "Explore", "Alpha 950": "Alpha_950", "Alpha 950XL": "Alpha_950XL", "Ilium_L1000": "ILIUM L1000", "Ilium L820": "ILIUM L820", "Ilium_L950": "ILIUM L950", "ilium PAD i8 v3": "ILIUM PAD I8", "ILIUM L1100": "Ilium_L1100", "Lanix Ilium L420": "Ilium L420", "Ilium S130": "Ilium_S130", "ILIUM S520": "Ilium_S520", "Ilium L910": "Llium L910", "ILIUM_X100": "X100", "ILIUM X400": "X400", "ilium PAD E9": "ilium  PAD  E9", "ilium Pad E9": "ilium PAD E9", "Ilium_PAD_i7": "ilium PAD i7", "ilium_Pad_E7": "ilium Pad E7", "Ilium S106": "ilium_S106", "Cumulus_5_HD": "Cumulus 5 HD", "Cumulus_5.5_HD": "Cumulus 5.5 HD", "Cumulus_6_HD": "Cumulus 6 HD", "LAVAA1": "A1", "LAVA_A3": "A3", "LAVA_A44": "A44", "A76Plus": "A76plus", "Lava A89": "A89", "A97 IPS": "A97", "A97 2GB PLUS": "A97 2GB Plus", "era1X": "ERA 1X", "era1Xpro": "ERA 1X", "era_4G": "Era 4G", "P3": "Flair P3", "S1": "Android One S1", "iris505": "Iris 505", "iris820": "Iris820", "P7plus": "P7 Plus", "PixelV1": "Pixel V1", "LAVA_R1": "R1", "R1_Lite": "R1LITE", "V23GB": "V2 3GB", "V2s M": "V2s", "LAVA V5": "V5", "LavaX10": "X10", "X28 Plus": "X28plus", "X41 Plus": "X41Plus", "LT900": "XOLO LT900", "era 4K": "XOLO era 4K", "Era 2X": "Era 2X 2GB", "era_X": "Xolo Era X", "era 2": "Xolo era 2", "iris821": "iris 821", "iris880": "iris 880", "Fuel F2": "iris Fuel F2", "A1": "A1R", "A3": "iris atom 3", "MD1005": "MD1005 Tablet", "X4-40": "LeTV X40", "Le Pan TC1010": "TC1010", "Le Pan TC1020": "TC1020", "Le Pan TC802A": "TC802A", "Le X520": "Le s2", "Le X526": "Le 2", "Le X527": "Le 2", "Le X509": "Le X507", "x600": "Le1", "X3-55 Pro": "Super TV X3-55 Pro", "X600": "x600", "INFINITY_light": "INFINITY light", "LIVE4_KM0438": "LIVE 4 KM0438", "KrugerMatz_LIVE4": "LIVE 4 KM0439", "LIVE4_KM0439": "LIVE 4 KM0439", "MOVE_6_mini": "MOVE 6 mini", "Le X820": "Le Max2", "Le X821": "Le Max2", "Le X829": "Le Max2", "LEX725": "LeoPro3", "LEX727": "LePro3", "Le X522": "Le S3", "X4-55": "X Serials(X43 Pro, X55, X65)", "Lenovo YB-Q501F": "YOGA Laptop with Android", "LenovoTV 32A3": "32A3   40A3   43A3   49A3", "AQUOS 50U3A": "55E82,49E82,50U3A,58U3A,70UD30A,60UD30A,80UD30A,65UR30A", "AQUOS 65UR30A": "55E82,49E82,50U3A,58U3A,70UD30A,60UD30A,80UD30A,65UR30A", "AQUOS 70UD30A": "55E82,49E82,50U3A,58U3A,70UD30A,60UD30A,80UD30A,65UR30A", "AQUOS 70UG30A": "55E82,49E82,50U3A,58U3A,70UD30A,60UD30A,80UD30A,65UR30A", "AQUOS 70XU30A": "55E82,49E82,50U3A,58U3A,70UD30A,60UD30A,80UD30A,65UR30A", "LenovoTV 49E82": "55E82,49E82,50U3A,58U3A,70UD30A,60UD30A,80UD30A,65UR30A", "LenovoTV 55E82": "55E82,49E82,50U3A,58U3A,70UD30A,60UD30A,80UD30A,65UR30A", "ideatv K72": "60K72", "IdeaPadA10": "A10", "Lenovo TAB 2 A10-70LC": "TAB 2 A10", "Lenovo A1000": "A1000", "IdeaTabA1000-F": "A1000", "IdeaTabA1000-G": "A1000-G", "IdeaTabA1000L-F": "A1000L", "Lenovo A1000m": "A1000m", "Lenovo A1010a20": "A1010", "Lenovo A1900": "A1900", "Lenovo A2010-a": "A2010-a", "Lenovo A2010l36": "A2010l36", "Lenovo A2016a40": "A2016a40", "Lenovo A2016b30": "A2016b30", "Lenovo A2016b31": "A2016b31", "Lenovo A2020a40": "A2020a40", "Lenovo A208t": "A208t", "Lenovo_A2105": "A2105", "A2107A-H": "A2107A", "Lenovo A218t": "A218t", "Lenovo A228t": "A228t", "Lenovo A238t": "A238t", "Lenovo A2580": "A2580", "Lenovo A269": "A269", "Lenovo A269i": "A269i", "Lenovo A278t": "A278t", "Lenovo A2800-d": "A2800", "Lenovo A2860": "A2860", "Lenovo A3000-H": "A3000", "Lenovo A300t": "A300t", "LNV-Lenovo A305e": "A305E", "Lenovo A305e": "A305E", "Lenovo A308t": "A308t", "Lenovo A316": "A316", "Lenovo A316i": "A316i", "Lenovo A318t": "A318t", "Lenovo A319": "A319", "Lenovo A3910t30": "A31910t30", "Lenovo A320t": "A320t", "Lenovo A328": "A328", "Lenovo A328t": "A328t", "LenovoA3300-H": "A3300", "Lenovo A3300-T": "A3300", "LenovoA3300-GV": "Lenovo A3300", "Lenovo A3300-HV": "A3300-HV", "Lenovo A330e": "A330e", "Lenovo A338t": "A338t", "Lenovo A3500": "A3500", "Lenovo A3500-HV": "A3500", "EveryPad2": "A3500-F", "Lenovo A3500-F": "A3500-F", "Lenovo A3500-FL": "A3500-FL", "Lenovo A3500-H": "A3500-H", "Lenovo A355e": "A355e", "Lenovo A358t": "A358t", "Lenovo A3600-d": "A3600-D", "Lenovo A3600u": "A3600u", "Lenovo A360e": "A360e", "Lenovo A360t": "A360t", "Lenovo A368t": "A368t", "Lenovo A369": "A369", "Lenovo A369i": "A369i", "LNV-Lenovo A370e": "A370e", "LNV-Lenovo A375e": "A375e", "Lenovo A376": "A376", "Lenovo A378t": "A378t", "Lenovo A3800-d": "A3800-D", "LNV-Lenovo A380e": "A380e", "Lenovo A380t": "A380t", "LNV-Lenovo A385e": "A385e", "Lenovo A3580": "A3860", "Lenovo A3860": "A3860", "Lenovo A388t": "A388t", "Lenovo A390": "A390", "Lenovo A390_ROW": "A390", "Lenovo A3900": "A3900", "Lenovo A390t": "A390t", "LNV-Lenovo A395e": "A395e", "Lenovo A396": "A396", "Lenovo A396_TY": "A396", "Lenovo A398t": "A398t", "Lenovo A398t+": "A398t+", "Lenovo A399": "A399", "Lenovo A5000": "A5000", "LNV-Lenovo A505e": "A505e", "Lenovo A516": "A516", "Lenovo A526": "A526", "Lenovo A529": "A529", "Lenovo A536": "A536", "Lenovo A5500": "A5500", "Lenovo A5500-F": "A5500-F", "Lenovo A5500-H": "A5500-H", "Lenovo A5500-HV": "A5500-HV", "Lenovo A560": "A560", "LNV-Lenovo A560": "A560", "Lenovo A5800-D": "A5800-D", "LenovoA588t": "A588t", "Lenovo A6000": "A6000", "Lenovo A6000-l": "A6000-l", "Lenovo A6010": "A6010", "Lenovo A606": "A606", "Lenovo A616": "A616", "Lenovo A628t": "A628t", "LNV-Lenovo A630e": "A630", "Lenovo A656": "A656", "Lenovo A658t": "A658T", "Lenovo A6600d40": "A6600", "Lenovo A6600a40": "A6600 Plus", "Lenovo A670t": "A670t", "Lenovo A678t": "A678t", "Lenovo A680": "A680", "Lenovo A680_ROW": "A680", "Lenovo A6800": "A6800", "Lenovo A688t": "A688t", "LNV-Lenovo A690e": "A690e", "Lenovo TAB 2 A7-30GC": "A7-30GC", "Lenovo TAB 2 A7-30D": "A7-30H", "Lenovo TAB 2 A7-30H": "A7-30H", "Lenovo A7-60HC": "A7-60HC", "Lenovo A7000-a": "A7000 Plus", "Lenovo A706": "A706", "Lenovo A706_ROW": "A706_ROW", "Lenovo A720e": "A720e", "Lenovo A750e": "A750e", "Lenovo A760": "A760", "Lenovo A7600": "A7600", "Lenovo A7600-m": "A7600", "Lenovo A7600-F": "A7600-F", "Lenovo A7600-H": "A7600-H", "Lenovo A7600-HV": "A7600-HV", "Lenovo A766": "A766", "Lenovo A768t": "A768t", "Lenovo A7700": "A7700", "Lenovo A770e": "A770e", "LNV-Lenovo A780e": "A780e", "LNV-Lenovo A785e": "A785e", "Lenovo A788t": "A788t", "Lenovo TAB 2 A8-50L": "A8-50", "Lenovo 2 A8-50LC": "A8-50", "Lenovo TAB 2 A8-50LC": "A8-50", "Lenovo A805e": "A805e", "Lenovo A806": "A806", "Lenovo A808t": "A808t", "Lenovo A808t-i": "A808t-i", "Lenovo A5100": "A816", "Lenovo A816": "A816", "Lenovo A820": "A820", "Lenovo A820e": "A820e", "Lenovo A820t": "A820t", "Lenovo A858": "A828", "Lenovo A828t": "A828t", "Lenovo A830": "A830", "Lenovo A850": "A850", "Lenovo A850+": "A850+", "Lenovo A858t": "A858t", "Lenovo A859": "A859", "Lenovo A860e": "A860e", "Lenovo A889": "A889", "Lenovo A890e": "A890e", "Lenovo A916": "A916", "Lenovo A936": "A936", "Lenovo A938t": "A938t", "Lenovo B6000-F": "B6000-F", "Lenovo B6000-H": "B6000-H", "Lenovo B6000-HV": "B6000-HV", "Lenovo B8000-F": "B8000-F", "Lenovo B8000-H": "B8000-H", "Lenovo B8080-F": "B8080", "Lenovo B8080-H": "B8080-H", "Lenovo B8080-HV": "B8080-HV", "MEDION E4002": "E4002", "IdeaTab A3000-F": "EveryPad", "ideatv K91": "IdeaTV", "LenovoA1000L-F": "IdeaTab A1000", "IdeaTabA1010-T": "IdeaTab A1010", "IdeaTabA1020-T": "IdeaTab A1020", "IdeaTab A3000-H": "IdeaTab A3000", "Vodafone Smart Tab III 7": "IdeaTab A3000", "IdeaTabA5000-E": "IdeaTab A5000", "IdeaTab S6000-F": "IdeaTab S6000", "IdeaTab S6000-H": "IdeaTab S6000", "Vodafone Smart Tab III 10": "IdeaTab S6000", "ThinkPad Tablet": "Indigo", "Lenovo K10e70": "K10e70", "Lenovo K50a40": "K3 Note", "Lenovo K50-t3s": "K50", "Lenovo K50-T5": "K3 Note", "Lenovo K50-t5": "K50-T5", "Lenovo K30-E": "K30-E", "Lenovo K30-T": "K30-T", "Lenovo K30-TM": "K30-TM", "Lenovo K30-W": "K30-W", "Lenovo K32c36": "K32", "Lenovo K32c30": "K32c30", "Lenovo A6020a40": "K5", "Lenovo A6020a41": "K5", "Lenovo A6020l36": "K5", "Lenovo A6020l37": "K5", "Lenovo A7020a40": "K5 Note", "Lenovo A7020a48": "K5 Note", "Lenovo L38012": "K5 Note", "Lenovo K52e78": "K5 Note", "Lenovo K52t58": "K5 Note", "Lenovo A6020a46": "K5 Plus", "Lenovo K520": "K520", "Lenovo S680": "K520", "Lenovo K52t38": "K52t38", "Lenovo k52t38": "K52t38", "Lenovo K800": "K800", "Lenovo K80M": "K80M", "Lenovo K860": "K860", "Lenovo K860i": "K860i", "Lenovo K900": "K900", "Lenovo K900_ROW": "K900", "Lenovo K910": "K910", "Lenovo K910L": "K910L", "LNV-Lenovo K910e": "K910e", "Lenovo K910e": "K910e", "Lenovo K920": "K920/VIBE Z2 Pro", "Lenovo L38011": "L38011", "Lenovo L38021": "L38021", "LIFETAB_E10310": "LIFETAB E10310", "LIFETAB_E7310": "LIFETAB E7310", "LIFETAB_E7312": "LIFETAB E7310", "Lenovo A708t": "Lenovo", "Lenovo A880": "Lenovo", "Lenovo PB1-770P": "Lenovo", "LenovoA3300-HV": "Lenovo A3300", "L18011": "Lenovo A5", "Lenovo K": "Lenovo K8 Plus", "XT1902-3": "Lenovo K8 Note", "VR-1541F": "Lenovo Mirage Solo", "Lenovo Intel Braswell Chromebook": "Lenovo N Series Chromebook", "Lenovo TB-8803F": "Lenovo TAB", "Lenovo TB-7504F": "Lenovo TAB 7", "PC-TE507JAW": "Lenovo TAB 7", "Lenovo TB-7504N": "Lenovo TAB 7", "Lenovo TB-7504X": "Lenovo TAB 7", "701LV": "Lenovo TAB4", "702LV": "Lenovo TAB4", "Lenovo TB-7304I": "Lenovo Tab 7 Essential", "Lenovo TB-7304N": "Lenovo Tab 7 Essential", "Lenovo TB-7304X": "Lenovo Tab 7 Essential", "Lenovo TB-7104F": "Lenovo Tab E7", "TB-X704A": "Lenovo Tab4 10 Plus", "Lenovo X2-CU": "Lenovo X2-CU/VIBE X2", "Lenovo YB-Q501L": "YOGA Laptop with Android", "Lenovo TB-X705F": "Lenovo tab P10", "Lenovo TAB 2 A7-30DC": "LenovoTAB2 A7-30DC", "Lenovo TB-7104I": "LenovoTB-7104I", "Lenovo TB-8304F": "LenovoTB-8304F", "TB-8704V": "LenovoTB-8704V", "Lenovo TB-X304F": "LenovoTB-X304F/Lenovo TAB4", "TB-X304F": "LenovoTB-X304F/Lenovo TAB4", "Lenovo TB-X704F": "LenovoTB-X704F/Lenovo TAB4 10 Plus", "AQUOS 58U1": "LenovoTV 40S9;LenovoTV 50S9;AQUOS 40U1;AQUOS 50U1；AQUOS 58U1; AQUOS 60LX765A", "AQUOS 60LX765A": "LenovoTV 40S9;LenovoTV 50S9;AQUOS 40U1;AQUOS 50U1；AQUOS 58U1; AQUOS 60LX765A", "AQUOS 60UE20A": "LenovoTV 40S9;LenovoTV 50S9;AQUOS 40U1;AQUOS 50U1；AQUOS 58U1; AQUOS 60LX765A", "LenovoTV 40S9": "LenovoTV 40S9;LenovoTV 50S9;AQUOS 40U1;AQUOS 50U1；AQUOS 58U1; AQUOS 60LX765A", "LenovoTV 58S9": "LenovoTV 40S9;LenovoTV 50S9;AQUOS 40U1;AQUOS 50U1；AQUOS 58U1; AQUOS 60LX765A", "AQUOS 50S1": "LenovoTV 50S52;AQUOS LCD-50S1A", "LenovoTV 50S52": "LenovoTV 50S52;AQUOS LCD-50S1A", "Lenovo K320t": "Lenovo_K320t", "Lenovo S960": "S960", "XT1700": "Moto E3", "XT1706": "Moto E3 Power", "XT1663": "Motorola M", "XT1662": "Motorola Moto M", "Lenovo N300": "N300", "Lenovo N308": "N308", "PC-TE507FAW": "NEC  PC-TE507FAW", "PC-TS508FAM": "NEC PC-TS508FAM", "Lenovo P1a41": "P1", "Lenovo P1a42": "P1", "Lenovo P1c72": "P1", "Lenovo P1c58": "P1", "Lenovo P2a42": "P2", "Lenovo P2c72": "P2", "Lenovo P70-A": "P70", "Lenovo P70-t": "P70", "Lenovo P780": "P780", "Lenovo P780_ROW": "P780", "Lenovo P90": "P90", "Lenovo PB1-750M": "PB1-750M/Lenovo PHAB", "EveryPad3": "PB1-770M/Lenovo PHAB Plus", "Lenovo PB1-770M": "PB1-770M/Lenovo PHAB Plus", "Lenovo PB1-770N": "PB1-770N", "Lenovo PB2-650M": "PB2", "Lenovo PB2-670M": "PB2 plus", "Lenovo PB2-670M1": "PB2 plus", "Lenovo PB2-650Y": "PB2-650Y", "Lenovo PB2-650N": "PHAB 2", "Lenovo PB2-670N": "PHAB 2 Plus", "Lenovo PB2-670Y": "PHAB 2 Plus", "Lenovo PB2-690M": "PHAB2 Pro", "Lenovo PB2-690N": "PHAB2 Pro", "Lenovo PB2-690Y": "PHAB2 Pro", "Lenovo S1a40": "S1", "Lenovo S1La40": "S1La40", "Lenovo S5000-F": "S5000", "Lenovo S5000-H": "S5000", "Lenovo S580": "S580", "Lenovo S60-a": "S60", "Lenovo S60-t": "S60", "Lenovo S60-w": "S60", "Lenovo S6000L-F": "S6000L", "ideatv S61": "S61", "Lenovo S650": "S650_ROW", "Lenovo S658t": "S658t", "Lenovo S660": "S660", "Lenovo S668t": "S668t", "Lenovo S686": "S686", "Lenovo S720": "S720", "Lenovo S750": "S750", "Lenovo S810t": "S810t", "Lenovo S820": "S820", "Lenovo S820_ROW": "S820", "Lenovo S820e": "S820e", "Lenovo S850": "S850", "Lenovo S850e": "S850e", "Lenovo S850t": "S850t", "Lenovo S856": "S856", "Lenovo S858t": "S858t", "Lenovo S860": "S860", "Lenovo S860e": "S860e", "Lenovo S868t": "S868", "LNV-Lenovo S870e": "S870e", "Lenovo S870e": "S870e", "Lenovo S898t": "S898t", "Lenovo S898t+": "S898t+", "Lenovo S90-e": "S90", "Lenovo S90-A": "S90-A", "Lenovo S90-L": "S90-L", "Lenovo S90-t": "S90-T", "Lenovo S90-u": "S90-U", "Lenovo S920": "S920", "Lenovo S930": "S930_ROW", "Lenovo S938t": "S938t", "Lenovo S939": "S939", "Lenovo S968t": "S968t", "501LV": "Softbank 501LV", "Lenovo TB-X103F": "TAB 10", "Lenovo TAB 2 A10-70F": "TAB 2 A10", "Lenovo TAB 2 A10-70L": "TAB 2 A10", "Tab2A7-10F": "TAB 2 A7-10F", "Tab2A7-20F": "TAB 2 A7-20F", "Lenovo TAB 2 A7-30F": "TAB 2 A7-30F", "Lenovo 2 A7-30HC": "TAB 2 A7-30HC", "Lenovo TAB 2 A7-30HC": "TAB 2 A7-30HC", "Lenovo 2 A7-30TC": "TAB 2 A7-30TC", "Lenovo 2 A8-50F": "TAB 2 A8-50F", "Lenovo TAB 2 A8-50F": "TAB 2 A8-50F", "Lenovo TB3-850F": "TAB 3 850F", "Lenovo TB3-850M": "TAB 3 850M", "Lenovo TAB S8-50F": "TAB S8-50F", "Lenovo TAB S8-50L": "TAB S8-50L", "Lenovo S8-50LC": "TAB S8-50LC", "Lenovo TAB S8-50LC": "TAB S8-50LC", "Lenovo TB-7703F": "TAB3 7 Plus", "Lenovo TB-7703N": "TAB3 7 Plus", "Lenovo TB-7703X": "TAB3 7 Plus", "Lenovo TB3-730F": "TAB3 730F", "Lenovo TB3-730M": "TAB3 730M", "Lenovo TB3-730X": "TAB3 730X", "Lenovo TB-8703R": "TAB3 8 Plus", "Lenovo TB3-X70L": "TAB3 X70L", "Lenovo TB3-X70N": "TAB3 X70N", "Lenovo TB-X304L": "TAB4 10", "Lenovo TB-X304N": "TAB4 10", "TB-X304N": "TAB4 10", "Lenovo TB-X304X": "TAB4 10", "Lenovo TB-X704L": "TAB4 10 Plus", "Lenovo TB-X704N": "TAB4 10 Plus", "TB-X704N": "TAB4 10 Plus", "TB-X704V": "TAB4 10 Plus", "Lenovo TB-X704Y": "TAB4 10 Plus", "Lenovo TB-8504F": "TAB4 8", "TB-8504F": "TAB4 8", "Lenovo TB-8504L": "TAB4 8", "Lenovo TB-8504N": "TAB4 8", "Lenovo TB-8504X": "TAB4 8", "Lenovo TB-8604F": "TB-8604F", "Lenovo TB-8704F": "TB-8704F", "Lenovo TB-8704N": "TB-8704N", "Lenovo TB-8704X": "TB-8704X", "Lenovo TB-8804F": "TB-8804F", "Lenovo TB-8X04F": "TB-8X04F", "Lenovo TB2-X30F": "TB2-X30F", "Lenovo TB2-X30F_HFT": "TB2-X30F", "Lenovo TB2-X30F_JLC": "TB2-X30F", "Lenovo TB2-X30F_SCP": "TB2-X30F", "Lenovo TB2-X30F_UK": "TB2-X30F", "Lenovo TB2-X30F_YZA": "TB2-X30F", "Lenovo TB2-X30L": "TB2-X30L", "Lenovo TB2-X30M": "TB2-X30M", "Lenovo TB2-X30M_PRC_YZ_A": "TB2-X30M", "Lenovo TB-8703F": "TB3 8 Plus", "Lenovo TB-8703N": "TB3 8 Plus", "Lenovo TB-8703X": "TB3 8 Plus", "601LV": "TB3-601LV", "602LV": "TB3-602LV", "Lenovo TB3-710F": "TB3-710F", "Lenovo TB3-710I": "TB3-710I", "Lenovo TB3-X70F": "TB3-X70F", "Lenovo TB3-X70I": "TB3-X70I", "Lenovo TB-7304F": "Tab 7 Essential", "ThinkPad 11e Chromebook 3rd Gen (Yoga/Clamshell)": "ThinkPad 11e Chromebook 3rd Gen", "Lenovo Thinkpad 11e Chromebook (4th Gen)/Lenovo Thinkpad Yoga 11e Chromebook (4th Gen)": "Thinkpad 11e Chromebook (4th Gen)/Lenovo Thinkpad Yoga 11e Chromebook (4th Gen)", "M123": "Thinkpad Stack projector", "Lenovo K10a40": "VIBE K10", "Lenovo K33a48": "VIBE K6", "Lenovo K33b36": "VIBE K6", "Lenovo K33b37": "VIBE K6", "Lenovo K53a48": "VIBE K6 Note", "Lenovo K53b36": "VIBE K6 Note", "Lenovo K53b37": "VIBE K6 Note", "Lenovo K33a42": "VIBE K6 Power", "Lenovo A7010a48": "VIBE X3 Lite", "Lenovo K51c78": "VIBE X3 Lite", "Lenovo X2-AP": "X2", "Lenovo X2-EU": "X2", "Lenovo X2Pt5": "X2 Pro", "VIBE X2Pt5": "X2 Pro", "Lenovo X2-TO": "X2-TO/VIBE X2", "Lenovo X2-TR": "X2-TR/VIBE X2", "Lenovo X3a40": "X3a40", "Lenovo X3c50": "X3c50", "Lenovo X3c70": "X3c70", "Lenovo YB1-X90L": "YOGA BOOK", "Lenovo YB1-X90F": "YOGA BOOK", "YOGA Tablet 2-1050L": "YOGA Tablet Pro-1050L/Yoga Tablet 2", "YOGA Tablet 2-1050LC": "YOGA Tablet Pro-1050LC/Yoga Tablet 2", "YOGA Tablet 2 Pro-1380F": "YOGA Tablet Pro-1380F/Yoga Tablet 2 Pro", "YOGA Tablet 2 Pro-1380L": "YOGA Tablet Pro-1380L/Yoga Tablet 2 Pro", "YOGA Tablet 2-830L": "YOGA Tablet Pro-830L/Yoga Tablet 2", "YOGA Tablet 2-830LC": "YOGA Tablet Pro-830LC/Yoga Tablet 2", "Lenovo YT3-850F": "YT3-850F/Lenovo YOGATab3", "Lenovo YT3-850L": "YT3-850L/Lenovo YOGATab3", "Lenovo YT3-850M": "YT3-850M/Lenovo YOGATab3", "Lenovo YT3-X50F": "YT3-X50F/Yoga3 Tablet", "Lenovo YT3-X50L": "YT3-X50L/Yoga3 Tablet", "Lenovo YT3-X50M": "YT3-X50M/Yoga3 Tablet", "Lenovo YT3-X90F": "YT3-X90F/YOGA3 Tablet Pro", "Lenovo YT3-X90L": "YT3-X90L/YOGA3 Tablet Pro", "Lenovo YT3-X90X": "YT3-X90X/YOGA3 Tablet Pro", "Lenovo YT3-X90Y": "YT3-X90Y/YOGA3 Tablet Pro", "Lenovo YT3-X90Z": "YT3-X90Z/YOGA3 Tablet Pro", "Lenovo YT-X703F": "Yoga TAB3 Plus", "Lenovo YT-X703L": "Yoga TAB3 Plus", "Lenovo YT-X703X": "Yoga TAB3 Plus", "YOGA Tablet 2-1050F": "YogaTablet2 -1050F", "YOGA Tablet 2-830F": "YogaTbalet2-830F", "Lenovo Z2": "Z2", "Lenovo Z2w": "Z2w", "Lenovo L78011": "Z5", "Lenovo Z90": "Z90/VIBE Shot", "Lenovo Z90-7": "Z90/VIBE Shot", "Lenovo Z90-3": "Z90/VIBE Shot", "Lenovo Z90a40": "Z90a40/VIBE Shot", "ideatv K82": "ideatvK82 60LX750A  52LX750A  46LX750A  60LX850A  70LX850A 80LX850A", "Lenovo TB-X804F": "小新平板", "lephone_W8": "Lephone W8", "lephoneP1": "lephone P1", "lephone_W10": "lephone W10", "lephone_W15": "lephone W15", "lephone_W21": "lephone W21", "lephone_W7": "lephone W7", "MFC145FR1": "Fluo", "MFC191FR2": "Fluo XL", "MFC510FR1": "Fluo XL Premium Edition", "MFC512FR": "LexiTab 10\"", "MFC511DE": "LexiTab 10\\'\\'", "MFC511EN": "LexiTab 10\\'\\'", "MFC511FR": "LexiTab 10\\'\\'", "MFC147FR": "LexiTab 7\"", "MFC146DE": "LexiTab 7\\'\\'", "MFC146EN": "LexiTab 7\\'\\'", "MFC146FR": "LexiTab 7\\'\\'", "MFC146ES": "LexiTab 7\\'\\'\\t", "MFC513FR": "LexiTab® 10\"", "MFC148FR": "LexiTab® 7\"", "LBOX500": "Playdroid", "LifeWatch V": "V, FGL-00004", "LINTAB_TB701": "LIN", "SH940C-LN": "Smart Box HD", "DCN88_72604_LN": "X1 Prime", "FieldBook_E1": "FieldBook E1", "Logic Instrument Fieldbook F1": "Fieldbook F1", "Logic Instrument Fieldbook F53": "Fieldbook F53", "Logic Instrument Fieldbook K80": "Fieldbook K80", "Logic X4 Plus": "X4 Plus", "LOGIC X5A": "X5A", "B BOT 50": "B bot 50", "B BOT 550": "B bot 550", "C Bot Tab 100": "C bot tab 100", "C Bot Tab 70": "C bot tab 70", "IDbot553": "ID bot 553", "IDbot553PLUS": "ID bot 553+", "ID bot 53+": "IDbot53plus", "L-EGANTONE-R": "L-EGANT  ONE-R", "L-EGANTONE": "L-EGANT ONE", "L-EMENT401": "L-EMENT 401", "L-EMENT_403": "L-EMENT 403", "L-EMENT_TAB1040": "L-EMENT TAB 1040", "L-EMENT_1043_BTK": "L-EMENT TAB 1043 BTK", "L-EMENT 741": "L-EMENT TAB 741", "L-EMENT 742": "L-EMENT TAB 742", "L-ement_Tab_744": "L-EMENT TAB 744", "L-ementTab744P": "L-EMENT TAB 744P", "L-EMENT 400": "L-EMENT400", "L-EMENT500L": "L-EMENT500", "L-EMENT_TAB1042BTK": "L-EMENTTAB1042", "L-ITE 402": "L-ITE402", "L-ITE 452": "L-ITE452", "L-ITE 502": "L-ITE502", "L-ITE 552": "L-ITE552", "LIXIR1041": "L-IXIR TAB 1041", "L-IXIR_TAB_1046_HD": "L-IXIR TAB 1046HD", "L-IXIR_TAB_840": "L-IXIR TAB 840", "L-EMENT351": "L351", "L-EMENT743": "L743", "L-EMENT 740": "LEMENT TAB 740", "L-EMENT_TAB1042": "LEMENTTAB1042", "LEMENT_TAB901": "LEMENTTAB901", "Logikids_2": "Logikids", "Logikids_3": "Logikids 3", "M BOT 551": "M bot 551", "M_bot_tab_1150": "M bot Tab 1150", "M_bot_tab_71": "M bot Tab 71", "M BOT TAB 100": "M bot tab 100", "M BOT TAB 101": "M bot tab 101", "M BOT TAB 70": "M bot tab 70", "M bot 52": "M_ bot_ 52", "POWER BOT": "POWER bot", "LOGICOM_PLAYTAB_10": "Playtab 10", "Connect 5": "S504", "CT730": "Touch Tablet CT730", "VR BOT 552": "VRBOT552", "VR BOT 552 PLUS": "VRBOT552PLUS", "Tambour": "Tambour Horizon", "T2HD": "T2 HD", "Lumigon_T3": "T3", "LYF_LS-4006": "LS-4006", "LS-5505": "WATER F1", "Pure1": "M-HORSE", "EROS Power": "Eros Power", "M4_B1": "M4 B1", "M4_B2": "M4 B2", "M4_B3": "M4 B3", "M4-SS4453-R": "M4 SS4453-R", "M4-SS4457-R": "M4 SS4457-R", "M4-SS4458-R": "M4 SS4458-R", "Grand Pro": "MDC GrandPro", "TR10CS2": "Any 302", "TR10CD2": "Any 303", "iQE200": "PTB7QSG_3G", "Primo 81": "Primo81", "MTC 982": "Vodafone 785", "MTC 970H": "Vodafone Smart mini", "MTN-TBW5982C3": "5982C3", "MTN-8978P": "8978P", "MTN-L860": "MTN Sm@rt L860", "MTN-S730": "MTN Smart S730", "MTN-S735": "MTN Smart S735", "MTN-S810": "MTN Smart S810", "MTN-S620": "S620", "MTN-S720i": "S720i", "MTN-S630": "Sm@rt Mini S630", "M.T.T. Master": "Master", "M.T.T. Smart Fun": "Smart Fun", "X-treme Play Tab": "xtreme", "Trio Stealth_10": "Trio Stealth_10 Tablet", "Trio Stealth_8": "Trio Stealth_8 Tablet", "Trio Stealth_9": "Trio Stealth_9 Tablet", "Mad Catz M.O.J.O.": "M.O.J.O.", "TAB 711 4G": "TAB_711_4G", "iQM801": "Brace", "iQ181011N": "MLS Novel 3G", "iQ1452aN": "MLS iQ1452aN", "iQT800": "MLS_iQT800", "iQM1001": "Stage", "IQ1019N": "iQ1019N", "Mango S5": "Mango_S5", "Juno Q6": "Juno_Q6", "Masstel LT52": "LT52", "Masstel_Juno_Q5": "Masstel Juno Q5", "Masstel_Juno_Q5Plus": "Masstel Juno Q5 Plus", "Juno Q7": "Masstel Juno Q7", "Masstel_Juno_S6": "Masstel Juno S6", "Masstel Tab10": "Masstel_Tab10", "Masstel N535": "N535", "Masstel_Tab7LTE": "Tab7LTE", "VFD 610": "Smart N8", "VFD 710": "Smart V8", "Astro_5N_LTE": "Astro 5N LTE", "Astro 55N LTE": "Astro_55N_LTE", "AstroPhablet7s": "MAXWEST", "Nitro_5N": "Nitro 5N", "Nitro 4s LTE": "Nitro_4s_LTE", "Ranger_5": "Ranger 5", "meanIT_C80C81": "meanIT C80C81", "MW16Q9_3G": "MW16Q9-3G", "MW16Q9_4G": "MW16Q9-4G", "TEI11011MST": "TEI11011", "M-PPxG5M": "G5M", "MEDION E4502": "E4502", "MEDION E4506": "E4506", "B4570": "E4507", "MEDION E5004": "E5004", "B5060": "E5005", "B5032": "E5006/P5006", "B5070": "E5008", "MEDION B5530": "E5504", "LIFETAB_E731X": "E731x", "BOSCH_E10316": "LIFETAB E10316", "LIFETAB_E10316": "LIFETAB E10316", "LIFETAB_E10320": "LIFETAB E10320", "MICROSTAR_E10319": "LIFETAB E10320", "E1041X": "LIFETAB E1041X", "E1060X": "LIFETAB E1060X", "LIFETAB_E723X": "LIFETAB E723X", "LIFETAB_E7313": "LIFETAB E7313", "LIFETAB_E7316": "LIFETAB E7316", "LIFETAB_S7316": "LIFETAB E7316", "LIFETAB_E732X": "LIFETAB E732X", "LIFETAB_E733X": "LIFETAB E732X", "LIFETAB_S733X": "LIFETAB E732X", "LIFETAB_P1034X": "LIFETAB P1034X", "LIFETAB_P733X": "LIFETAB P733x", "LIFETAB_P831X": "LIFETAB P831X", "LIFETAB_P831X.2": "LIFETAB P831X", "LIFETAB_P891X": "LIFETAB P891X", "LIFETAB_P970X": "LIFETAB P970X", "S1032X": "LIFETAB S1032X", "LIFETAB_S1033X": "LIFETAB S1033X", "LIFETAB_S1034X": "LIFETAB S1034X", "LIFETAB_S785X": "LIFETAB S785X", "LIFETAB_S786X": "LIFETAB S786x", "LIFETAB_S831X": "LIFETAB S831X", "LIFETAB_P9514": "Lifetab P9514", "P740X": "Media Base P740X", "P1040X": "P1050X", "X1060X": "P1060X", "MEDION P5004": "P5004", "MEDION P5005": "P5005", "MEDION P5015": "P5015", "P72035": "P73035", "MEDION S5004": "S5004", "B5531": "S5504", "LIFETAB_S732X": "S7322", "X1030X": "X1030x", "B5532": "X5520", "MEDION X6001": "X6001", "E10319": "microstar E10319", "MegaFon Login 3": "Login 3", "ALCATEL ONE TOUCH 7030R": "MS4B", "ALCATEL ONE TOUCH 7030Y": "MS4B", "Meitu M4": "M4", "MP1503": "M6", "MP1709": "M8s", "MP1603": "Maya", "MP1701": "Meitu T8s", "MP1605": "Meitu V6", "Meitu V4": "V4", "Meitu V4s": "V4s", "MP1602": "Victoria", "MEIZU E3": "E3", "MEIZU M6": "M6", "Meizu M6s": "M6s", "Meizu mblu S6": "M6s", "Meizu M8c": "M8c", "M712C": "Meizu S6", "PRO 7-H": "PRO 7", "PRO 7-S": "PRO 7", "MTAB-07535AK": "MTAB-0753AK", "T4": "MGT_T4", "Micromax A110": "A110", "Micromax A50": "A50", "Micromax A56": "A56", "Micromax A57": "A57", "Micromax A62": "A62", "Micromax A72": "A72", "Micromax A73": "A73", "Micromax A87": "A87", "Micromax A91": "A91", "A068": "BOLT", "Micromax A069": "BOLT", "Micromax A24": "BOLT", "Micromax A34": "BOLT", "Micromax A67": "BOLT", "Micromax A69": "BOLT", "Micromax Q332": "BOLT", "Micromax Q338": "BOLT", "Micromax Q440Plus": "Bharat 4", "Micromax Bharat 5": "Bharat 5", "Micromax Bharat 5 Plus": "Bharat 5 Plus", "Micromax Q437": "Bharat Go", "B5Pro": "Bhart 5 PRO", "Micromax A064": "Bolt", "Micromax A065": "Bolt", "Micromax A066": "Bolt", "Micromax A067": "Bolt", "Micromax A082": "Bolt", "A35": "Bolt", "Micromax A79": "Bolt", "Micromax A82": "Bolt", "Micromax AD3520": "Bolt", "Micromax AD4500": "Bolt", "Micromax_D200": "Bolt", "Micromax D303": "Bolt", "Micromax D304": "Bolt", "Micromax D305": "Bolt", "Micromax D320": "Bolt", "Micromax D321": "Bolt", "Micromax D333": "Bolt", "Micromax D340": "Bolt", "Micromax Q3001": "Bolt", "Micromax Q301": "Bolt", "Micromax Q303": "Bolt", "Micromax Q323": "Bolt", "Micromax Q324": "Bolt", "Micromax Q325": "Bolt", "Micromax Q326": "Bolt", "Micromax Q331": "Bolt", "Micromax Q333": "Bolt", "Micromax Q335": "Bolt", "Micromax Q336": "Bolt", "Micromax Q341": "Bolt", "Micromax Q346": "Bolt", "Micromax Q381": "Bolt", "Micromax Q383": "Bolt", "Micromax S300": "Bolt", "Micromax S301": "Bolt", "Micromax S302": "Bolt", "Micromax Q3551": "Bolt Juice", "Micromax Q402": "Bolt Pace", "Micromax Q3301": "Bolt Q3301", "Micromax Q424": "Bolt Selfie", "Micromax Q352": "Bolt Supreme 4", "Micromax A120": "CANVAS 2 COLOURS", "A110Q": "CANVAS 2 PLUS", "Micromax A110Q": "CANVAS 2 PLUS", "Micromax A114R": "CANVAS BEAT", "MT500": "CANVAS BLAZE", "Micromax A102": "CANVAS DOODLE 3", "Micromax AE90": "CANVAS DUET", "Micromax EG111": "CANVAS DUET 2", "Micromax A121": "CANVAS ELANZA 2", "Micromax A091": "CANVAS ENGAGE", "Micromax A105": "CANVAS ENTICE", "Micromax A300": "CANVAS GOLD", "Micromax A350": "CANVAS KNIGHT", "Micromax A117": "Canvas Magnus", "Micromax A96": "CANVAS POWER", "Micromax A118R": "CANVAS TUBE", "A250": "CANVAS TURBO", "Micromax A200": "CANVAS TURBO MINI", "Micromax A106": "Unite2", "Micromax Q4310": "Canvas 2", "Micromax A315": "Canvas 4+", "Micromax E481": "Canvas 5", "Micromax Q463": "Canvas 5 Lite", "Micromax E485": "Canvas 6", "Micromax E484": "Canvas 6 Pro", "Micromax AQ4501": "Canvas A1", "Micromax AQ4502": "Canvas A1", "Micromax Q395": "Canvas AMAZE", "Micromax Q400": "Canvas Blaze", "Micromax Q414": "Canvas Blaze 4G Plus", "Micromax Q391": "Canvas Doodle4", "Micromax E483": "Canvas Evok", "Micromax Q411": "Canvas FIRE4G", "Micromax A093": "Canvas Fire", "Micromax A104": "Canvas Fire", "Micromax Q462": "Canvas Fire 4G", "Micromax Q386": "Canvas Fire 5", "Micromax Q428": "Canvas Fire 6", "Micromax A096": "Canvas Fire3", "Micromax A107": "Canvas Fire4", "Micromax A76": "Canvas Fun", "Micromax A190": "Canvas HD Plus", "Micromax AQ5000": "Canvas Hue", "Micromax A316": "Canvas Hue 2", "Micromax HS2": "Canvas Infinity", "Micromax HS1": "Canvas Infinity Life", "Micromax_HS3": "Canvas Infinity Pro", "Micromax A77": "Canvas Juice", "Micromax Q394": "Canvas Juice 3+", "Micromax Q382": "Canvas Juice 4", "Micromax Q461": "Canvas Juice 4G", "Micromax Q398": "Canvas Juice 6", "Micromax AQ5001": "Canvas Juice2", "Micromax Q392": "Canvas Juice3", "Micromax A290": "Canvas Knight Cameo", "Micromax E471": "Canvas Knight2", "Micromax A108": "Canvas L", "Micromax Q421": "Canvas Magnus HD", "Micromax E353": "Canvas Mega", "Micromax Q417": "Canvas Mega", "Micromax Q426": "Canvas Mega 2", "Micromax A310": "Canvas Nitro", "Micromax A311": "Canvas Nitro", "Micromax E311": "Canvas Nitro2", "Micromax Q416": "Canvas Pace 4G", "Micromax Q401": "Canvas Pace MIni", "Micromax Q370": "Canvas Pep", "Micromax Q371": "Canvas Pep", "Micromax Q375": "Canvas Pep", "Micromax Q355": "Canvas Play", "Micromax Q412": "Canvas Play 4G", "Micromax Q469": "Canvas Play4G", "Micromax E451": "Canvas Pulse", "Micromax Q334": "Canvas SPARK2", "Micromax A255": "Canvas Selfie", "Micromax Q349": "Canvas Selfie 4", "Micromax Q345": "Canvas Selfie Lens", "Micromax Q480": "Canvas Space 2", "Micromax Q479": "Canvas Space 2+", "Micromax Q380": "Canvas Spark", "Micromax Q350": "Canvas Spark 2 Plus", "Micromax Q380N": "Canvas Spark 3", "Micromax Q385": "Canvas Spark 3", "Micromax Q4201": "Canvas Spark 4G", "MicromaxF666": "Canvas Tab", "MicromaxP480": "Canvas Tab", "P480": "Canvas Tab", "Micromax P681": "Canvas Tab", "Micromax P690": "Canvas Tab", "Micromax P701": "Canvas Tab", "MicromaxP702": "Canvas Tab", "P70221": "Canvas Tab", "MicromaxP802": "Canvas Tab", "Micromax P810": "Canvas Tab", "P469": "Canvas Tabby", "Micromax A250": "Canvas Turbo", "Micromax Q427": "Canvas Unite 4", "Micromax Q465": "Canvas Unite 4 Pro", "Micromax A109": "Canvas XL2", "Micromax A99": "Canvas Xpress", "Micromax E314": "Canvas Xpress 2", "Micromax Q413": "Canvas Xpress 4g", "Micromax P290": "Canvas tab", "P470": "Canvas tab", "Micromax P666": "Canvas tab", "MicromaxP680": "Canvas tab", "Micromax Q491": "Doodle 4", "Micromax E4816": "Dual 4", "Micromax E4815": "EVOK DUAL NOTE", "Micromax E4817": "Evok Dual Note", "Micromax E453": "Evok Note", "Micromax Q4260": "Evok Power", "Micromax A94": "MAD", "Micromax Q440": "MIcromax Bharat 4", "Micromax Q402+": "Micromax Bharat 2 Plus", "Micromax Q402Plus": "Micromax Bharat 2 Plus", "Micromax C1": "Micromax Canvas 1", "Micromax Q4261": "Micromax Canvas Music M1", "Micromax C1A": "Micromax Canvax 1(2018)", "Micromax_Q353": "Micromax Q353", "Micromax_Q353P": "Micromax Q353 Plus", "Micromax Q4311": "Micromax Selfie 2", "Micromax Q4601": "Micromax Selfie 2 Note", "Micromax Q452": "Micromax Spark 4G Prime(2017)", "Micromax E352": "Nitro 3", "Micromax E455": "Nitro 4G", "Micromax Q327": "Q327", "Micromax Q350R": "Q350R", "Micromax Q354": "Q354", "Micromax Q300": "SUPREME BOLT", "Micromax Q340": "Selfie 2", "Micromax E460": "Selfie 3", "Micromax Q348": "Selfie 3", "Micromax Q450": "Sliver 5", "Micromax Q409": "Spark  4G(2017)", "Micromax A092": "UNITE", "Micromax Q379": "Unite 3", "Micromax Q372": "Unite3", "Micromax Q4001": "Vdeo 1", "Micromax Q4101": "Vdeo 2", "Micromax Q4202": "Vdeo 3", "Micromax Q4251": "Vdeo 4", "Micromax Q4220": "Vdeo 5", "Micromax E313": "Xpress 2", "YU4711": "YUNIQUE", "YU5200": "YUREKAS", "YU5551": "YUREKA S", "YU5012": "Yunique 2 Plus", "YU5010": "YUPHORIA", "YU5050": "Yutopia", "e-tab_style_REV3": "e-tab_style_rev.3", "TA10CA1": "MiiA", "MSW_BT767QC8TN": "MIKONA", "M4CR": "Clover", "M4CRD": "Clover", "Emerald_M55CR": "Emerald", "Emerald_M55CRD": "Emerald", "Mint Fox+": "M3CR2", "Mint Clover+": "M4CR2", "Mint_M55LD": "M55LD", "Pearl+_M5PD": "MINT_Pearl_plus", "MioTab 2016": "MioTab", "Mio Phone 2016": "Mio Phone", "MioPhone2017": "Mio Phone", "MI-JI-43T": "43T", "MI-JI-44T": "44T", "MI-JI-64T": "64T", "MI-CH-82S": "82S", "MITO A10": "A10", "MITO_A10": "A10", "Mito A67": "A67", "MITO A880": "A880", "mito A39": "MITO A39", "MITO A16": "T5091A", "HERO_X": "HERO X", "MOBICEL METRO2": "METRO2", "Sonic": "Mobicel", "Venus": "Mobicel", "GEM": "Mobicel GEM", "ICE": "Mobicel ICE", "PURE PLUS": "PURE_PLUS", "TREDNY": "Trendy", "TRENDY": "Trendy", "TRENDY PLUS": "Trendy Plus", "mobiistar LAI YUNA 1": "LAI YUNA 1", "mobiistar LAI Z1 4G": "LAI Z1 4G", "mobiistar_LAI_Z2": "LAI Z2", "mobiistar LAI ZORO 3": "LAI Zoro 3", "Zumbo_S_2017": "LAI Zumbo S 2017", "Zumbo_S_2017_Lite": "LAI Zumbo S 2017 Lite", "mobiistar_ZORO_4G": "ZORO 4G", "mobiistar ZORO 5": "ZORO 5", "Mobiistar_Zumbo_J2": "ZUMBO J2", "mobiistar ZUMBO Power": "ZUMBO Power", "mobiistar Zumbo S2": "ZUMBO S2", "mobiistar ZUMBO S2 Dual": "ZUMBO_S2_Dual", "CQ": "mobiistar", "E1 Selfie": "mobiistar E1 Selfie", "MTC_SMART_Surf_4G": "MTC SMART Surf 4G", "SMART_Race2_4G": "SMART Race2 4G", "MTC_SMART_Start_2": "SMART Start 2", "SMART_Turbo_4G": "SMART Turbo 4G", "MTC SMART Sprint 4G": "SMART_Sprint_4G", "SMART Surf2 4G": "Smart Surf2 4G", "MS55L1": "Gaia", "Cynus_F10": "Cynus F10", "Cynus_F9_4G": "Cynus F9 4G", "Cygnus45": "Cygnus", "Cygnus_mini": "Cygnus mini", "Halona": "MobiWire Halona", "Hawk_from_EE": "Hawk from EE", "KWANITA": "Kwanita", "KANUNA": "MobiWire Kanuna", "KAYA": "MobiWire Kaya", "Kosumi": "MobiWire Kosumi", "STARSHINE5": "STARSHINE 5", "STARSHINE_5": "STARSHINE 5", "Smart_A25": "STARSHINE 5", "STARXTREM5": "STARXTREM 5", "Telenor_SmartPlus": "Telenor SmartPlus", "V.45S": "V.45", "V.45": "VSN V.45", "Ticwatch E": "Ticwatch S Smartwatch; Ticwatch E Smartwatch", "Ticwatch S": "Ticwatch S Smartwatch; Ticwatch E Smartwatch", "FreeTAB 8015 IPS X4": "FreeTAB 8015 IPS X4 LTE", "TB_MONDIAL": "TB-MONDIAL", "MB SUMMIT": "Summit", "RevoYou": "Revo You", "MB860": "Atrix", "MB861": "Atrix", "ME860": "Atrix", "MB886": "Atrix HD", "MB300": "Backflip", "ME600": "Backflip", "MB200": "CLIQ", "morrison": "CLIQ", "MB502": "Charm", "WX442": "Citrus", "WX445": "Citrus", "XT301": "Citrus", "MB501": "Cliq-XT", "ME501": "Cliq-XT", "XT1021": "Moto X Play", "XT1565": "DROID MAXX 2", "RAZR HD": "DROID RAZR HD", "XT925": "DROID RAZR HD", "XT907": "RAZR M", "XT890": "RAZR i", "XT1585": "DROID Turbo 2", "MB525": "Defy", "MB526": "Defy", "ME525": "Defy", "ME525+": "Defy", "unknown": "Defy", "XT320": "Defy Mini", "XT321": "Defy Mini", "XT560": "Defy Pro", "calgary": "Devour", "A854": "Droid", "A853": "Droid", "Milestone": "Droid", "XT701": "Droid", "XT702": "Droid", "XT720": "Motoroi", "umts": "Droid", "DROID3": "Droid 3", "DROID4": "Droid 4", "DROID BIONIC": "Droid Bionic", "A955": "Droid II", "DROID2": "Droid II", "DROID2 GLOBAL": "Droid II", "XT1080": "Droid Ultra", "XT1030": "Droid Mini", "DROID PRO": "Droid Pro", "DROID Pro": "Droid Pro", "Milestone PLUS": "Droid Pro", "XT610": "Droid Pro", "XT910": "Droid RAZR", "201M": "RAZR M", "XT1250": "Droid Turbo", "XT1254": "Droid Turbo", "DROIDX": "Droid X", "MB810": "Droid X", "ME811": "Droid X", "Milestone X": "Droid X", "MotoroiX": "Droid X", "DROID X2": "Droid X2", "Milestone X2": "Droid X2", "XT881": "ELECTRIFY 2", "XT901": "Electrify M", "MB511": "Flipout", "ME511": "Flipout", "MotoMB511": "Flipout", "XT800": "Glam XT800", "Motorola_HS1": "HS1", "XT627": "Motoluxe", "XT621": "Master Touch XT621", "A953": "Milestone2", "ME722": "Milestone2", "MotoA953": "Milestone2", "Moto 360": "Moto 360 Sport", "XT1754": "Moto C", "XT1755": "Moto C", "XT535": "Moto Defy XT", "XT555C": "Moto Defy XT", "XT556": "Moto Defy XT", "XT557": "Moto Defy XT", "XT1019": "Moto E (1st Gen)", "XT830C": "Moto E (1st Gen)", "XT1025": "Moto E (1st Gen)", "XT1023": "Moto E (1st Gen)", "XT1022": "Moto E (1st Gen)", "MotoE2": "Moto E with 4G LTE (2nd Gen)", "XT0000": "Moto E (2nd Gen)", "Moto E": "moto e5 plus", "moto e5": "Moto E (5)", "MotoE2(4G-LTE)": "Moto E with 4G LTE (2nd Gen)", "XT1526": "Moto E with 4G LTE (2nd Gen)", "XT1528": "Moto E with 4G LTE (2nd Gen)", "XT1528O": "Moto E with 4G LTE (2nd Gen)", "Moto E (4)": "Moto E4", "XT1028": "Moto G (1st Gen)", "XT1031": "Moto G (1st Gen)", "XT937C": "Moto G (1st Gen)", "XT1002": "Moto G (1st Gen)", "XT1003": "Moto G (1st Gen)", "XT1008": "Moto G (1st Gen)", "XT1032": "Moto G Google Play edition", "XT1034": "Moto G (1st Gen)", "XT939G": "Moto G (1st Gen)", "XT1033": "Moto G (1st Gen)", "XT1069": "Moto G (2nd Gen)", "titan_retbr_dstv": "Moto G (2nd Gen)", "XT1063": "Moto G with 4G LTE (2nd Gen)", "XT1064": "Moto G (2nd Gen)", "XT1068": "Moto G (2nd Gen)", "titan_niibr_ds": "Moto G (2nd Gen)", "MotoG3": "Moto G Turbo Edition", "Moto G Play": "moto g6 play", "Moto G (4)": "Moto G(4) Plus", "XT1799-1": "Moto G (5S)", "XT1799-2": "Moto G (5S)", "Moto G (5)": "Moto G (5th Gen)", "Moto G (5) Plus": "moto g(6) plus", "MotoG3-TE": "Moto G Turbo Edition", "XT1039": "Moto G with 4G LTE (1st Gen)", "XT1040": "Moto G with 4G LTE (1st Gen)", "XT1042": "Moto G with 4G LTE (1st Gen)", "XT1045": "Moto G with 4G LTE (1st Gen)", "XT1072": "Moto G with 4G LTE (2nd Gen)", "XT1077": "Moto G with 4G LTE (2nd Gen)", "XT1079": "Moto G with 4G LTE (2nd Gen)", "XT1078": "Moto G with 4G LTE (2nd Gen)", "XT1609": "Moto G4 Play", "XT1225": "Moto Turbo", "XT1049": "Moto X (1st Gen)", "XT1050": "Moto X (1st Gen)", "XT1052": "Moto X (1st Gen)", "XT1053": "Moto X (1st Gen)", "XT1055": "Moto X (1st Gen)", "XT1056": "Moto X (1st Gen)", "XT1058": "Moto X (1st Gen)", "XT1060": "Moto X (1st Gen)", "XT1085": "Moto X (2nd Gen)", "XT1092": "Moto X (2nd Gen)", "XT1093": "Moto X (2nd Gen)", "XT1094": "Moto X (2nd Gen)", "XT1095": "Moto X (2nd Gen)", "XT1096": "Moto X (2nd Gen)", "XT1097": "Moto X (2nd Gen)", "XT1098": "Moto X (2nd Gen)", "XT1789-05": "Moto Z (2) Force", "moto x4": "Moto X (4)", "XT1580": "Moto X Force", "XT1581": "Moto X Force", "XT1562": "Moto X Play", "XT1563": "Moto Z Play", "XT1564": "Moto X Play", "Moto X Pro": "Moto X Pro (China)", "XT1575": "Moto X Pure Edition", "XT1572": "Moto X Style", "XT1570": "Moto X Style", "XT1650": "Moto Z Droid", "XT1650-05": "Moto Z", "Moto Z (2)": "Moto Z(3)", "Moto Z2 Play": "Moto Z (2) Play", "XT1710-02": "Moto Z (2) Play", "XT1710-08": "Moto Z (2) Play", "XT1710-11": "Moto Z (2) Play", "XT1635-02": "Moto Z Play", "XT1635-03": "Moto Z Play", "XT1635-01": "Moto Z Play Droid", "moto z3": "Moto Z(3)", "XT611": "Motoluxe", "XT615": "Motoluxe", "XT682": "Motoluxe", "XT685": "Motoluxe", "Motorola MOT-XT681": "Motoluxe", "XT687": "Motoluxe", "XT626": "Motoluxe", "Milestone XT720": "Motoroi", "Motorola XT720": "Motoroi", "XT389": "Motosmart", "XT390": "Motosmart", "XT303": "Motosmart", "XT305": "Motosmart", "Motorola Titanium": "Opus One", "Titanium": "Opus One", "XT897": "Photon", "XT897S": "Photon", "ISW11M": "Photon 4G", "MB855": "Photon 4G", "Motorola Electrify": "Photon 4G", "Motorola-XT502": "Quench XT3", "XT914": "RAZR D1", "XT915": "RAZR D1", "XT916": "RAZR D1", "XT918": "RAZR D1", "XT919": "RAZR D3", "XT920": "RAZR D3", "DROID RAZR HD": "RAZR HD", "XT885": "Razr V", "XT886": "Razr V", "XT300": "Spice", "Xoom": "XOOM", "MZ601": "XOOM", "MZ605": "XOOM", "MZ604": "XOOM", "MZ606": "XOOM", "MZ609": "XOOM 2", "MZ617": "XOOM 2", "moto e5 cruise": "moto e(5) cruise", "moto e5 play": "moto e(5) play", "moto e5 plus": "moto e(5) plus", "XT1924-9": "moto e5 plus", "moto e5 supra": "moto e5 plus", "XT1925-10": "moto g(6)", "moto g(6) (XT1925DL)": "moto g(6)", "XT1790": "moto g(6)", "moto g(6) play": "moto g6 play", "Moto Z3 Play": "moto z3 play", "BOSS Touch": "Boss Touch / TH 24/7 YOU", "TH 24/7 YOU": "Boss Touch / TH 24/7 YOU", "LX50": "LINNEX", "MOVIC-W5": "MOVIC_W5", "L452": "mtt L452", "MTT_L509": "mtt L509", "ML-JI-M7_3G_PLUS": "M7-3G PLUS", "ML-WI-M7_3G_PLUS": "M7-3G PLUS", "ML-JI-M7-4G": "M7-4G", "ML01-M7S-Quad-Core": "M7s Quad Core", "M7SQC_Plus": "M7SQC Plus", "M7s Dual ML03": "M7s Dual Core", "ML-SO-M9-3G": "M9-3G", "ML-WI-M9-3G": "M9-3G", "M9-3G_2": "M9-3G-2", "MS40S": "MS40s", "ML-CH-MS45_4G": "MS45 4G", "MS45S_A6": "MS45S", "MS50L_4G": "MS50L 4G", "MS60F_PLUS": "MS60F Plus", "ML-TI-MS80": "MS80", "MS5": "Trimble ConnectedTablet", "MS6": "Ms6", "GoTab_GBT10": "GoTab GBT10", "C-Smart_pix": "C-Smart pix", "CUBE_LTE": "Cube LTE", "myPhone Fun LTE": "Fun_LTE", "Hammer AXE Pro": "Hammer AXE PRO", "Hammer Active": "Hammer_Active", "Hammer Energy 3G": "Hammer_Energy_3G", "Hammer Iron 2": "Hammer_Iron_2", "Hykker_MyTab10": "Hykker MyTab10", "myPhone Go": "MyPhone Go!", "Q_Smart_BE": "myPhone", "C-Smart_Glam": "myPhone C-Smart Glam", "C-Smart IIIS": "myPhone C-Smart IIIS", "FUN5": "myPhone Fun 5", "HAMMER_ENERGY": "myPhone HAMMER ENERGY", "Hammer Energy": "myPhone Hammer Energy", "LUNA_II": "myPhone Luna II", "MAGNUS": "myPhone MAGNUS", "Prime_Plus": "My phone PRIME PLUS", "Pocket": "myPhone Pocket", "Q-Smart_Elite": "myPhone Q-Smart Elite", "Q-Smart_Plus": "myPhone Q-Smart Plus", "myPhone_C-Smart_4": "myPhone_C-Smart _4", "Fun5": "myPhone_Fun5", "Prime 2": "myPhone_Prime_2", "CityXL": "CITY XL", "myPhone CityXL": "CITY XL", "myPhone Cube": "CUBE", "FUN_18x9": "Fun 18x9", "myPhone_Fun6Lite": "Fun 6 Lite", "Bolt": "HAMMER BOLT", "HAMMER_AXE_M_LTE": "Hammer AXE M LTE", "Blade": "Hammer Blade", "Hammer_Iron_3_LTE": "Hammer Iron 3 LTE", "Hammer_Energy_18x9": "Hammer energy 18x9", "IRON_2": "Iron 2", "myPhone_Pocket_18x9": "Pocket 18X9", "Pocket_18x9_LTE": "Pocket18X9 LTE", "Prime_18x9": "Prime 18x9", "Prime_18x9_LTE": "Prime 18x9 LTE", "myPhone_Q-Smart_III": "Q-Smart_III", "SmartView_8_LTE": "SmartView_8", "SmartView_9_6_3G": "SmartView_9.6", "MyPhone UNO": "UNO", "MyPhone my28S": "my28S", "MyPhone my28S DTV": "my28S DTV", "MyPhone my71 DTV": "my71 DTV", "MyPhone my72 DTV": "my72 DTV", "MyPhone my73 DTV": "my73 DTV", "MyPhone my75 DTV": "my75 DTV", "MyPhone_my76 DTV": "my76 DTV", "MyPhone my77 DTV": "my77 DTV", "MyPhone my81 DTV": "my81 DTV", "MyPhone my85 DTV": "my85 DTV", "MyPhone_my86_DTV": "my86 DTV", "MyPhone my87 DTV": "my87 DTV", "MyPhone my88 DTV": "my88 DTV", "MyPhone my89 DTV": "my89 DTV", "MyPhone my91 DTV": "my91 DTV", "MyPhone my92 DTV": "my92 DTV", "MyPhone my93 DTV": "my93 DTV", "MyPhone my95 DTV": "my95 DTV", "MyPhone my96 DTV": "my96 DTV", "MY801": "myA1", "MYA11": "myA11", "MYA13": "myA13", "MY802": "myA2", "MY803": "myA3", "MY805": "myA5", "MY806": "myA6_DTV", "myA9 DTV": "myA9_DTV", "Q-Smart_III_Plus": "myPhone  Q-Smart III Plus", "MY807": "myX1", "MYX3": "myX3", "3G": "3G MY8300", "Classic": "Classic MY8301", "Cozy": "Cozy MY8302", "4G": "Myria 4G MY8303", "Myria_FIVE": "Myria FIVE", "Giant": "Myria Giant MY8304", "Myria_Grand_4G": "Myria Grand 4G", "Myria_Wide_2": "Myria Wide 2", "Myria_Wide_4G": "Myria Wide 4G", "NASCO_Allure_Plus": "Allure_Plus", "SNAP_PRO": "SNAP PRO", "NEC-101T": "101T 　MEDIAS", "N8730-411": "AGT10", "N8730-41101": "AGT10", "N8730-41102": "AGT10", "NEC-STR": "LifeTouch L D000-000035-002", "C811 4G": "CASIO G\\'zOne Commando 4G LTE", "C771": "Casio G\\'zOne Commando", "N-03E": "Disney Mobile on docomoN-03E", "IS11CA": "G\\'z One IS11CA", "CAL21": "G\\'zOne TYPE-L CAL21", "CA-201L": "G’zOne CA-201L", "PC-TE508BAW": "LaVieTab PC-TE508BAW", "LaVieTab PC-TE508S1": "LaVieTab PC-TE508S1W/LaVieTab PC-TE508S1L", "LaVieTab PC-TE510S1": "LaVieTab PC-TE510S1L", "D000-000013-101": "LifeTouch B", "D000-000018-001": "LifeTouch B", "D000-000018-002": "LifeTouch B", "D000-000018-003": "LifeTouch B", "D000-000018-004": "LifeTouch B", "D000-000018-101": "LifeTouch B", "D000-000018-102": "LifeTouch B", "D000-000018-104": "LifeTouch B", "D000-000019-002": "LifeTouch B", "D000-000019-001": "LifeTouch B", "LTB-HS": "LifeTouch B", "LT-TLA": "LifeTouch L", "D000-000010-N": "LifeTouch Note", "D000-000011-N": "LifeTouch Note", "LT-NA7": "LifeTouch Note", "LT-NA7F": "LifeTouch Note", "D000-000001-B01": "LifeTouch S", "D000-000001-B02": "LifeTouch S", "D000-000001-C01": "LifeTouch S", "D000-000001-K01": "LifeTouch S", "D000-000001-R01": "LifeTouch S", "D000-000001-R02": "LifeTouch S", "D000-000001-R03": "LifeTouch S", "D000-000001-R04": "LifeTouch S", "D000-000001-S00": "LifeTouch S", "D000-000001-S01": "LifeTouch S", "D000-000001-S05": "LifeTouch S", "D000-000001-S25": "LifeTouch S", "D000-000001-S85": "LifeTouch S", "D000-000007-D01": "LifeTouch S", "D000-000002-W01": "LifeTouch W", "D000-000002-W02": "LifeTouch W", "D000-000002-001": "LifeTouch W", "N-06E": "MEDIAS  X N-06E", "IS11N": "MEDIAS BR IS11N", "101N": "MEDIAS CH 101N", "N-05D": "MEDIAS ES N-05D", "N-04D": "MEDIAS LTE N-04D", "N-04C": "MEDIAS N-04C", "NE-202": "MEDIAS NE-202", "NEC-101S": "MEDIAS NEC-101S", "NEC-102": "MEDIAS NEC-102", "N-01D": "MEDIAS PP N-01D", "N-06D": "MEDIAS TAB N-06D", "N-02E": "MEDIAS U N-02E", "NE-103T": "MEDIAS U NE-103T", "N-05E": "MEDIAS W N-05E", "N-06C": "MEDIAS WP N-06C", "N-04E": "MEDIAS X N-04E", "N-07D": "MEDIAS X N-07D", "NEC-NE-201A1A": "NE-201", "LaVieTab PC-TS507N1S": "PC- TS507N1S", "PC-TS508T1W": "PC-508T1W", "PC-TS708T1W": "PC-708T1W", "LaVieTab PC-TE510N1B": "PC-TE510N1B", "Now": "Danamic Now", "NGM_Dynamic_Stylo": "Dynamic_Stylo", "E505plus": "E505 Plus", "ForwardEndurance": "Endurance", "Life": "LIFE", "NGM M500": "M500", "E400": "NGM Youcolor E400", "E450": "NGM Youcolor E450", "E501": "NGM Youcolor E501", "E505": "NGM Youcolor E505", "E506": "NGM Youcolor E506", "E507": "NGM Youcolor E507", "NGM P503": "P503", "NGM P550": "P550", "Forward Ruby": "Ruby", "ForwardRuby": "Ruby", "Smart5.5Plus32GB": "Smart5.5Plus", "Fresh_4G": "Fresh 4G", "NOA_N8": "N8", "SPRINT4G": "SPRINT 4G", "SHIELD Console": "SHIELD Android TV", "SHIELD Android TV": "SHIELD TV", "SHIELD": "Shield", "Tegra Note 7": "TegraNote", "TegraNote-P1640": "TegraNote", "TegraNote-Premium": "TegraNote", "NYX_A1": "A1", "BLiNK": "BLINK", "NYX_HIT": "HIT", "Rex": "REX", "NYX_SHADE": "SHADE", "NABI2-NV7A": "2 Tablet", "SNB02-NV7A": "2S Tablet", "NBTY07SMKG": "TOY 7", "DMTAB-NV20A": "Big Tab HD™ 20\"", "DMTAB-NV24A": "Big Tab HD™ 24\"", "DMTAB-IN08A": "DreamTab HD8 Tablet", "DMTAB-NV08B": "DreamTab HD8 Tablet", "NBFP07PMKG": "Fisher Price Learning Tablet", "NP-752": "NAVCITY NP-752", "NP-852": "NAVCITY NP-852", "NP-855": "NAVCITY NP-855", "NAVITEL T700 3G NAVI": "Navitel T700 3G Navi", "NAVON F552": "F552", "Navon_Infinity": "Infinity", "M505_4G": "M505", "Navon Supreme Pure": "Navon Supreme  Pure", "Platinum_10_3G_V2": "Platinum 10 3G", "Supreme_Fine": "Supreme Fine", "Supreme_Fine_Mini": "Supreme Fine Mini", "Supreme_Pro": "Supreme Pro", "T400 3G 2017": "T400 3G", "Vision_Tab_10": "Vision Tab 10", "iQ7_2018": "iQ7 2018", "NID-1009": "NID1009", "NID-7019": "NID7019", "NID-9009": "NID9009", "NV8": "NV8-HD", "Neffos C5": "C5", "Neffos C5 Max": "C5 Max", "TP601A": "C5L", "TP601B": "C5L", "TP601C": "C5L", "TP601E": "C5L", "Neffos_C9A": "Neffos C9A", "Neffos_X9": "Neffos X9", "Neffos C5a": "TP703A", "Neffos C5s": "TP704A", "Neffos Y5 Lite": "TP704A", "Neffos_C7A": "TP705", "Neffos X1 Lite": "X1 Lite", "Neffos Y5": "Y5", "Neffos Y50": "Y50", "Neffos Y5L": "Y5L", "ViewPad-Kids-7A": "ViewPad 7A", "GTV100": "NeoTVPrime", "NB RunIQ": "Run IQ", "Newsday_A2": "A2", "Newsday_E1": "E1", "Mi438S": "journey one", "N3": "Nexttab N3", "NBCGGP01": "GoPlayer", "Nextel V.35": "V.35", "NII Nextel": "V.45", "COOLPIX S800c": "COOLPIX", "nJoy_Arcas_7": "Arcas 7", "Chronos_10": "Chronos 10", "Kali_8": "Kali 8", "nJoy_Tityos_10": "Tityos 10", "nJoy_Turnus_8": "Turnus 8", "Theia_10": "nJoy Theia 10", "N551": "Go Action", "N552": "Go Move", "N504": "Go Street", "N503": "Go Urban", "TA-1020": "Nokia 3", "TA-1028": "Nokia 3", "TA-1032": "Nokia 3", "TA-1038": "Nokia 3", "TA-1024": "Nokia 5", "TA-1027": "Nokia 5", "TA-1044": "Nokia 5", "TA-1053": "Nokia 5", "TA-1000": "Nokia 6", "TA-1003": "Nokia 6", "TA-1054": "Nokia 6", "TA-1021": "Nokia 6", "TA-1025": "Nokia 6", "TA-1033": "Nokia 6", "TA-1039": "Nokia 6", "TA-1041": "Nokia 7", "TA-1004": "Nokia 8", "TA-1012": "Nokia 8", "TA-1052": "Nokia 8", "Nomi_C070030": "CORSA 3 LTE", "Nomi_C070012": "Corsa 3 3G", "i5032": "I5032", "Nomi_C080012": "Libra3 3G", "Nomi C080010 Libra2": "Nomi C080010", "C101010 Ultra2": "Nomi C101010", "Nomi_i5001": "Nomi i5001", "i5013": "Nomi i5013", "i5050": "Nomi i5050", "i5510": "Nomi i5510", "Nomi_i5511": "Nomi i5511", "i5532": "Nomi i5532", "Nomi_C101012": "ULTRA3 3G", "Nomi_C101030": "ULTRA3 LTE", "Nomi_C101040": "ULTRA3 LTE PRO", "S50_Pro": "S50 Pro", "NS5005": "Fabulous", "NS5008": "Optimum", "hk101": "Now E", "LS032I": "N2 Lite", "LS032M": "N2 Lite", "NUU_A1": "A1", "NUU_A3": "A3", "NUU_A3L": "A3L", "N5001L": "A4L", "N5704L": "G1", "S6001L": "G2", "NUU_M2": "M2", "NUU_M3": "M3", "N5702L": "NUU G3", "S5701L": "NUU M4X_PRO", "S4001W": "NUU_A2", "NUU_X5": "X5", "CT1000": "TM1088", "Endeavour101": "TM1088", "WEBPAD1002": "TM1088", "i-touch M1": "O\\'NICE I-TOUCH M1", "PACE10": "PACE 10", "FALCON_10_PLUS_3G": " FALCON_10_PLUS_3G", "BM57_lite": "BM57 lite", "OTOT_E1": "E1", "OYYUT11": "T11", "OBI MV1": "MV1", "Obi MV1": "MV1", "SJ1-5": "OBJ SJ1.5", "Xiphos(R)TMD": "Xiphos®TMD", "UNO_X8": "UNO X8", "Octopus A83 CT4": "CT4", "CT3": "OliveOil Model 3", "C2 pro": "C2 Pro", "ONE A2003": "OnePlus2", "ONEPLUS A3000": "OnePlus3T", "A0001": "One", "ONE E1003": "X", "ONEPLUS A6003": "OnePlus 6", "ONEPLUS A5000": "OnePlus5", "ONEPLUS A5010": "OnePlus5T", "A31t": "A13t", "A1601fw": "A1601", "PBAM00": "A3", "A33fw": "A33f", "OPPO A33m": "A33m", "OPPO A35": "A35", "OPPO A37": "A37", "OPPO A37m": "A37m", "A37fw": "A37f", "A37f": "A37fw-International", "OPPO A37t": "A37t", "OPPO A37tm": "A37tm", "OPPO A39": "A39", "OPPO A39m": "A39m", "OPPO A39t": "A39t", "OPPO A39tm": "A39tm", "Lava A51": "A51", "A51f": "A51fa", "OPPO A53": "A53", "OPPO A53m": "A53m", "OPPO A57": "A57", "OPPO A57t": "A57t", "OPPO A59": "A59", "OPPO A59m": "A59m", "OPPO A59s": "A59", "OPPO A59st": "A59st", "OPPO A59t": "A59t", "OPPO A59tm": "A59tm", "OPPO A73": "A73", "OPPO A73t": "A73t", "OPPO A77": "A77", "OPPO A77t": "A77", "OPPO A79": "A79", "OPPO A79k": "A79k", "OPPO A79kt": "A79kt", "OPPO A79t": "A79t", "OPPO A83": "A83", "OPPO A83t": "A83t", "CPH1705fw": "CHP1705", "OPPO CPH1605": "CPH1605", "CPH1613fw": "CPH1613", "CPH1701fw": "CPH1701", "CPH1707fw": "CPH1707", "CPH1803": "CPH1803RU", "F1fw": "F1f", "F1w": "F1f", "F1f": "F1w", "X909": "Find5", "X909T": "X909", "N5111": "N1 mimi", "N5116": "N1 mimi", "N5206": "N3", "N5207": "N3", "N5209": "N3", "R1011": "R1011w", "OPPO R11": "R11", "OPPO R11t": "R11", "OPPO R11 Plus": "R11 Plus", "OPPO R11 Plusk": "R11 Plusk", "OPPO R11 Pluskt": "R11 Pluskt", "OPPO R11 Plust": "R11 Plust", "OPPO R11s": "R11s", "OPPO R11s Plus": "R11sPlus", "OPPO R11s Plust": "R11sPlust", "OPPO R11st": "R11st", "R8106": "R5", "R8107": "R5", "R8109": "R5", "OPPO R7": "R7", "R7kf": "R7 Lite", "R7Plus": "R7 Plus", "R7plusf": "R7Plusf", "R7Plusm": "R7 Plusm", "OPPO R7s": "R7s", "OPPO R7sPlus": "R7s Plus", "R7sf": "R7sfg", "R831T": "R831", "OPPO R9": "R9", "OPPO R9km": "R9km", "OPPO R9m": "R9m", "OPPO R9tm": "R9tm", "OPPO R9 Plusm A": "R9PlusmA", "OPPO R9 Plustm A": "R9PlustmA", "OPPO R9 Plus A": "R9 Plus A", "X9079": "R9Plus", "OPPO R9 Plust A": "R9PlustA", "OPPO R9k": "R9k", "CPH1607": "R9s", "CPH1607fw": "R9s", "OPPO R9s": "R9s", "CPH1611": "R9s Plus", "OPPO R9s Plus": "R9s Plus", "OPPO R9s Plust": "R9s Plus", "OPPO R9sPlus": "R9s Plus", "OPPO R9sk": "R9sk", "OPPO R9skt": "R9sk", "OPPO R9st": "R9st", "OPPO R9t": "R9t", "U705W": "Ulike2", "U705T": "Ulike2", "oraimo R401": "R401", "oraimo R402": "R402", "Orange Dive 30": "Dive 30", "ZTE Blade A410": "Blade A410", "Orange Dive 50": "Dive 50", "Orange Dive 71": "Dive 71", "Orange-Dive72": "Dive72", "OrangeFive": "Five", "Orange Neva 80": "Neva 80", "Orange Nura": "Nura", "Nura 2": "Nura2", "Orange_Rise_33": "Orange Rise 33", "Race 1": "Race_1", "Orange Rise 30": "Rise 30", "Orange Rise 40": "Rise 40", "Rise50": "Rise 50", "Orange-Rise30": "Rise30", "Orange-Rise31": "Rise31", "Orange-Rise34": "Rise31", "Orange Rise32": "Rise32", "Orange-Rise51": "Rise51", "Orange-Rise51B": "Rise51", "Orange-Rise52": "Rise52", "Orange Roya": "Roya", "Orange Sego": "Sego", "Orange Niva": "idol S", "R370L": "R370H", "RC555L": "Wonder", "K3": "Coosea", "K10000 Max": "K10000_Max", "OK6000 Plus": "OK6000 PLUS", "OWN FUN 7": "Entel PCS Telecomunicaciones S.A.", "SMART_O2": "OWN Smart Ö2", "OWN FUN 6": "OWN_FUN_6", "Smart8": "SMART 8", "OWN SMART 9": "SMART 9", "SMART PLUS LTE": "Smart Plus Lte", "T72HMs_3G": "T72HMs 3G", "PCSGOB10MVA_A": "PCSMART", "PC_Smart_PTSGOB8": "PTSGOB8", "PCB-T103 CURI LITE": "Curi_Lite_PCB-T103", "Smart_Page_8_Pro": "Smart Page 8 Pro", "P9000_MAX": "P9000 MAX", "P10": "POPTEL P10", "DX01C": "43DX400C", "TH-55DX600C": "55DX600C", "VW_RCBKK1": "Boukenkun-reciever", "dL1": "ELUGA", "Panasonic ELUGA A": "ELUGA A", "ELUGA_A3": "ELUGA A3", "ELUGA_A3_Pro": "ELUGA A3 Pro", "Panasonic_ELUGA_C": "ELUGA C", "Panasonic ELUGA I": "ELUGA I", "ELUGA_I2_Activ": "ELUGA I2 Activ", "ELUGA_I5": "ELUGA I5", "Eluga I9": "ELUGA I9", "Panasonic ELUGA L 4G": "ELUGA L 4G", "P-03E": "ELUGA P", "Panasonic_ELUGA_Pure": "ELUGA PURE", "P-07D": "ELUGA Power", "Eluga_Ray_700": "ELUGA Ray 700", "Panasonic ELUGA S": "ELUGA S", "Panasonic ELUGA S Mini": "ELUGA S Mini", "Panasonic ELUGA U": "ELUGA U", "Panasonic ELUGA U2": "ELUGA U2", "P-06D": "ELUGA V", "Panasonic ELUGA WE": "ELUGA WE", "P-02E": "ELUGA X", "Panasonic_dL1": "ELUGA dL1", "Eco v3": "Eco12 v3", "Eco v3 plus": "Eco12 v3 Plus", "Elite": "Elite 18", "Elitev3": "Elite13 v3", "Elite v3a with camera": "Elite 12 v3.1", "Elite v3a": "Elitev3a", "Eluga_A2": "Eluga A2", "Panasonic ELUGA Arc": "Eluga Arc", "Eluga_Arc_2": "Eluga Arc 2", "ELUGA_I2": "Eluga I2", "Panasonic_Eluga_I3": "Eluga I3", "Panasonic ELUGA Icon 2": "Eluga Icon 2", "Eluga_Mark_2": "Eluga Mark 2", "ELUGA_Pulse": "Eluga Pulse", "ELUGA_Pulse_X": "Eluga Pulse X", "ELUGA Ray": "Eluga Ray", "ELUGA Ray 530": "Eluga Ray 530", "ELUGA Ray 710": "Eluga Ray 710", "Eluga_Ray_800": "Eluga Ray 800", "ELUGA Ray Max": "Eluga Ray Max", "ELUGA Ray X": "Eluga Ray X", "Panasonic ELUGA Tapp": "Eluga Tapp", "Panasonic ELUGA Z": "Eluga Z", "ELUGA Note": "Eluga_Note", "FZ-A1B": "FZ-A1", "FZ-B2B": "FZ-B2", "FZ-N1": "FZ-N1F", "HD PSEB v2": "HDPSEB v2", "IPSC4": "IPSC 4", "Panasonic KX-PRXA10": "KX-PRXA10", "Panasonic KX-PRXA15": "KX-PRXA15", "DMC-CM1": "LUMIX CM1", "Panasonic P11": "P11", "Panasonic P31": "P31", "Panasonic P41": "P41", "Panasonic P41HD": "P41 HD", "Panasonic P51": "P51", "Panasonic P55": "P55", "Panasonic P55 Novo": "P55 Novo", "P55 Novo 4G": "P55 Novo", "Panasonic P61": "P61", "Panasonic_P61": "P61", "Panasonic P75": "P75", "Panasonic P77": "P77", "Panasonic P81": "P81", "Panasonic P85": "P85", "Panasonic P99": "P99", "P100": "Panasonic P100", "P101": "Panasonic P101", "9 inch SDU": "SDU", "Smart Monitor 17": "SM17", "Panasonic SV-ME1000": "SV-ME1000", "Panasonic T11": "T11", "Panasonic T21": "T21", "Panasonic T30": "T30", "Panasonic T31": "Yaris M", "Panasonic T33": "T33", "Panasonic T40": "T40", "Panasonic T41": "T41", "Panasonic T44": "T44", "Panasonic T44 Lite": "T44 Lite", "Panasonic T9": "T9", "TAB-A01-SD": "TAB-A01", "TAB-A02-SD": "TAB-A02", "DX00C": "TH-49DX400C", "TH55DR600C": "TH-55DR600C", "TH_55DX700C": "TH-55DX700C", "TH_65DX400C": "TH-65DX400C", "theaterv3": "Theater v3", "WA-P7": "Translation device", "Panasonic UN-MT300": "UN-MT300", "Panasonic UN-W700": "UN-W700", "Video Handset": "VHS v2", "WSCU3": "WSCU", "FZ-B2D": "fz_b2dh", "IM-T100K": "AT1", "ADR8995": "Apache", "PantechP9070": "Burst", "PantechP8000": "Crossover", "IM-A760S": "EF33S", "IM-A770K": "VEGA RACER", "IM-A780L": "VEGA RACER", "PantechP4100": "Element", "PantechP8010": "Flex", "IM-A810K": "IM-810K", "IM-A840SP": "IM-840SP", "SKY IM-A630K": "Izar", "EIS01PT": "MIRACH_J", "IS11PT": "MIRACH_J", "IM-A690L": "Mirach", "IM-A690S": "Mirach", "IM-A750K": "Mirach A", "PantechP9090": "P9090", "PantechP9060": "Pocket", "IS06": "SIRIUS α", "SKY IM-A600S": "Sirius", "Pantech V955": "v955", "IM-A890K": "VEGA Secret Note", "IM-A890L": "VEGA Secret Note", "IM-A890S": "VEGA Secret Note", "IM-A900S": "VEGA Secret UP", "IM-A900K": "VEGA Secret UP", "IM-A900L": "VEGA Secret UP", "SKY IM-A650S": "Vega", "IM-A820L": "Vega LTE M", "IM-A720L": "Vega X", "IM-A710K": "Vega X", "IM-A725L": "ef14lv", "Pantech V950": "v950", "S70PCI": "Batman", "Pavapro7bk": "PavaPro7bk", "Pavapro10bk": "Pavapro10", "chagall": "Olipad", "Chagall 10.1 WiFi": "chagall", "E-Tab 4G": "chagall", "PNDP70M7BLK": "Pendo", "PTB7PAP_PTB7PAB_PTB7PAR": "PTB7PAP_ PTB7PAB _ PTB7PAR", "QM152E": "4K & Full HD Slim LED TV powered by Android™", "TPM171E": "4K LED TV powered by Android", "QM151E": "4K Razor Slim LED TV powered by Android TV™", "QM161E": "4K Razor Slim OLED TV powered by Android TV", "QV151E": "4K UHD Razor Slim LED TV powered by Android™", "QM163E": "4K Ultra Slim LED TV powered by Android", "AND1E": "Android 2014", "QM164E": "FHD Ultra Slim LED TV Powered by Android", "HMP8100_ATV_93": "HMP8100/93", "HMP8100_ATV_INT": "HMP8100/98", "TLE722G": "PHILIPS", "G3SMNTS22": "PHP-S221C4AFD", "G3SMNTS23": "PHP-S231C4AFD", "PI3100": "PI3100/98", "PI3100-93": "PI3100/93", "PI3100Z3_93": "PI3100Z3/93", "PI3900-93": "PI3900", "PI3900": "PI3900/98", "PI7100_93": "PI7100/93", "Philips Xenium V787": "V787", "Philips S398": "Philps S398", "Philips S308": "S308", "Philips S309": "S309", "Philips_S326": "S326", "Philips S327": "S327", "Philips S337": "S337", "Philips S395": "S395", "PI7000": "T8 PI7000", "Philips V377": "Xenium V377", "Philips V387": "V387", "Philips V526": "V526", "Philips_W3500": "W3500", "Philips W3568": "W3568", "Philips W6610": "W6610", "Philips W8510": "W8510", "Philips W8555": "W8555", "Philips_X586": "X586", "Philips X588": "X588", "Philips X818": "X818", "Philips S386": "Xenium S386", "Jupiter": "Car Navigation", "jupiter": "Navigation", "Turbo-X_A2": "A2", "Calltab7inch": "Calltab 7”", "Calltab2GB10": "Calltab2GB10.1\"", "Calltab10.1": "CalltabII 10.1", "Turbo-X Coral II": "Coral II", "Earth 7.0\\'3G": "Earth 7.0\\' 3G", "TURBOX_I4G": "I4G", "Turbo-X_e3": "Lithium Ion", "RainbowII 3G": "Rainbow II 3G 8\"", "RubikII7": "Rubik-II", "Rubik 10.1 II": "RubikII 10\"", "QUAD-CORE A33 inet": "Turbo-X Twister", "s2": "Turbo-X s2", "Turbo-X lamda": "lamda", "FTU152A": "FREETEL Priori3S", "FTJ162B": "FREETEL SAMURAI KIWAMI 2", "FTU161G": "Fun +", "FTJ161E-VN": "Ice 2", "ICE2": "Ice 2", "FTJ152D": "Kiwami", "FTJ152A": "Priori 3", "FTJ152B": "Priori3S", "Smart_HD": "Smart HD", "PLUZZ_PL4010": "PL4010", "PM550": "PM550R", "Polar M600": "M600", "HS-7DTB39": "A7_PTAB735", "BDL5048PR001": "BDL5048", "P5026A": "Cosmo L", "P5046A": "Cosmo P5s", "P5047A": "Cosmo Z", "PSPCZ20A0": "Cosmo Z2", "PSPCM20A0": "Cosmo Z2 Plus", "MID 1324": "Infinite", "K7/PTAB782": "K7", "P900/Q900": "P900", "PRO5548PR010": "PRO5548PR010.191", "PTAB1051_PTAB1055": "PTAB1051-PTAB1055", "PRO5023": "Phantom 5", "SIGMA-5": "SIGMA 5", "CARBON_PRO4543": "V45M", "POLYTRON_P552": "POLYTRON P552", "Porsche Rear Seat Entertainment": "SDIS1", "8MA-A 3G": "8MA-A", "YPY_AB7D": "AB7", "YPY_AB7DC": "AB7D", "Positivo BGH 7Di-A": "BGH Y210", "Positivo BGH Y200": "BGH Y200", "Y230": "BGH Y230", "S421 Positivo Life": "Life", "Positivo Mini": "Mini", "Positivo Mini TE": "Mini", "Positivo Next": "Next", "Positivo One": "One", "S420": "One", "Positivo SX1000": "SX1000", "S455": "Selfie", "Positivo Slim": "Slim", "T1060B": "T1060", "T1060C": "T1060", "Positivo T1075": "T1075", "T701": "T701 TV", "T705/T708": "T705", "T705K": "T705", "Positivo T710": "T710", "Stilo T715": "T715", "Positivo Stilo T730 Kids": "T730", "Positivo T750": "T750", "Positivo Twist M": "Twist", "Positivo Twist S": "Twist", "Twist (2018)": "Twist 2018", "Positivo Twist 4G": "Twist 4G", "Twist Metal 32GB": "Twist Metal 32G", "Positivo US2070": "Union US2070", "YPY_10FTA": "YPY 10 3G", "Positivo Ypy AB7E": "YPY AB7", "Positivo Ypy AB7EC": "YPY AB7", "YPY_S400": "YPY S400", "Positivo Ypy 7 - TB07FTA": "YPY7 3G", "Ypy 7 - TB07FTA": "YPY7 3G", "YPY_07FTA": "YPY7 3G", "Positivo Ypy 7 - TB07STA": "YPY7 wifi", "Ypy 7 - TB07STA": "YPY7 wifi", "YPY_07STA": "YPY7 wifi", "POSITIVO TABLET YPY 07FTB PM BEL\\xc3\\x89M": "Ypy 07FTB", "YPY_07FTB": "Ypy 07FTB", "YPY_07FTBF": "Ypy 07FTBF", "YPY_07STB": "Ypy 07STB", "YPY_07STBF": "Ypy 07STBF", "YPY_10FTB": "Ypy 10FTB", "YPY_10FTBF": "Ypy 10FTBF", "YPY_10STB": "Ypy 10STB", "YPY_10STBF": "Ypy 10STBF", "YPY_AB10D": "Ypy AB10", "YPY_AB10DC": "Ypy AB10D", "YPY_AB10DP": "Ypy AB10DP", "Positivo Ypy AB10E": "Ypy AB10E", "Positivo Ypy AB10EC": "Ypy AB10E", "Positivo Ypy AB10H": "Ypy AB10H", "Positivo Ypy AB7F": "Ypy AB7F", "T720": "Ypy AB7F", "YPY_AB7K": "Ypy AB7K", "Positivo Ypy L700 Kids": "Ypy Kids", "Positivo Ypy L700+ Kids": "Ypy Kids", "Positivo Ypy L1000": "Ypy L1000", "Positivo Ypy L1000F": "Ypy L1000", "Positivo Ypy L1050": "Ypy L1050", "Positivo Ypy L1050F": "Ypy L1050", "Positivo Ypy L1050E": "Ypy L1050E", "Positivo Ypy L700": "Ypy L700", "Positivo Ypy L700 Ed. Especial": "Ypy L700", "Positivo Ypy L700+": "Ypy L700", "Positivo BGH Mini": "Ypy Mini", "YPY_S350": "Ypy S350", "YPY_S350_PLUS": "Ypy S350p", "YPY_S405": "Ypy S405", "YPY_S450": "Ypy S450", "YPY_S460": "Ypy S460", "YPY_S500": "Ypy S500", "YPY_TQ7": "Ypy TQ7", "Positivo BGH Y300": "mini I", "Positivo Mini I": "mini I", "Positivo BGH Y100": "BGH Y100", "Positivo BGH Y210": "BGH Y210", "Y400": "BGH Y400", "Positivo BGH Y700": "BGH Y700", "Positivo BGH Y710 KIDS": "BGH Y710 kids", "Positivo BGH M840": "M840", "Positivo BGH P718TAB": "P718TAB", "Positivo BGH W750": "W750", "Positivo BGH Y1010": "Y1010", "L701 TV": "Ypy", "Positivo BGH Ypy L700": "Ypy", "Positivo BGH Ypy L700 Kids": "Ypy Kids", "P450": "PREMIO P450", "P610": "Premio P610", "P620": "Premio P620", "Prestige 7G": "7G", "Elite10Q": "ELITE10Q", "Elite7Q": "ELITE7Q", "Elite8QS": "ELITE8QS", "PSP5515DUO": "GRACE P5", "PSP7557": "Grace", "PMT3118_3G": "Grace 3118 3G", "PSP3455DUO": "Grace X3", "PSP5470DUO": "Grace X5", "PSP7505DUO": "Grace X7", "PMT3237_3G": "MT3237_3G", "PMT3027_Wi": "MULTIPAD WIZE 3027", "PMT3108_3G": "MULTIPAD WIZE 3108 3G", "PMT3111_Wi": "MULTIPAD WIZE 3111", "PMT3121_Wi": "MULTIPAD WIZE 3121", "PMT3308_3G": "MULTIPAD WIZE 3308 3G", "PMT3331_3G": "MULTIPAD WIZE 3331 3G", "PMT3341_3G": "MULTIPAD WIZE 3341 3G", "PMT3787_3G": "MULTIPAD WIZE 3787 3G", "PMT3377_Wi": "MultiPad Thunder 7.0i", "PMT3009_Wi_C": "MultiPad Wize 3009", "PMT3017_WI": "MultiPad Wize 3017", "PMT3018_WI": "MultiPad Wize 3018", "PMT3037_3G": "MultiPad Wize 3037 3G", "PMT3038_3G": "MultiPad Wize 3038 3G", "PSP5453DUO": "MultiPhone 5453 DUO", "PSP5455DUO": "MultiPhone 5455 DUO", "PSP5504DUO": "MultiPhone 5504 DUO", "PSP5505DUO": "MultiPhone 5505 DUO", "PSP5517DUO": "MultiPhone 5517 DUO", "PMT3407_4G": "Multipad Wize 3407 4G", "PMT3408_4G": "Multipad Wize 3408 4G", "PMT3508_4G": "Multipad Wize 3508 4G", "PMT3757_3G": "Multipad Wize 3757 3G", "PSP5508DUO": "Multiphone 5508 DUO", "PSP3452DUO": "Muze A3", "PMT3008_Wi_C": "PMT3008_Wi", "PSP3512DUO": "PSP3512", "PSP3551DUO": "PSP3551", "PSP5531DUO": "PSP5531", "PMT3708_3G": "Prestigio Muze 3708 3G", "PSP3453DUO": "WIZE A3", "PMT3131_3G": "Wize 3131 3G", "PMT3147_3G": "Wize 3147 3G", "PMT3401_3G": "Wize 3401 3G", "PLT1077G": "PLT1077G(1GB/8GB)", "PLT1074G": "PLT7774G", "PLT8235G": "PLT8235G Tablet", "SLTDVD9220-C": "SLTDVD9220_C", "Noir A1": "A1", "Noir A1 lite": "A1 lite", "QMobile Beat 1": "Beat 1", "QMobile Blue 5": "Blue 5", "QMobile CS1": "CS1", "QMobile CS1 Plus": "CS1 Plus", "QMobile Dual One": "Dual One", "QMobile E1": "E1", "E2 Noir": "E2", "QMobile ENERGY X1": "ENERGY X1", "QMobile ENERGY X2": "ENERGY X2", "QMobile Energy X10 4G": "Energy X10 4G", "QMobile Energy X5 4G": "Energy X5 4G", "QMobile Evok Power": "Evok Power", "QMobile Evok Power Lite": "Evok Power Lite", "QMobile J1": "J1", "QMobile J2": "J2", "JAZZX JS10": "JS10", "QMobile L20": "L20", "QMobile LT100": "LT100", "QMobile LT550": "LT550", "QMobile_LT600_PRO": "LT600 PRO", "QMobile A3": "NOIR A3", "QMobile A6": "NOIR A6", "QMobile Noir S9": "Noir S9", "QMobile A1": "Pakistan", "QMobile Q Infinity B": "Q Infinity B", "QMobile Q Infinity C": "Q Infinity C", "QMobile_Q_Infinity_Cinema": "Q Infinity Cinema", "QMobile Q Infinity D": "Q Infinity D", "QMobile Q Infinity E": "Q Infinity E", "QMobile Q Infinity E Lite": "Q Infinity E Lite", "QMobile Q Infinity Prime": "Q Infinity Prime", "QMobile QNote": "QNote", "S8 Plus": "Qmobile S8 Plus", "QMobile S1 Lite": "S1 Lite", "QMobile S1 PRO": "S1 PRO", "QMobile S2 Plus": "S2 Plus", "QMobile S6": "S6", "QMobile S6 PLUS": "S6 PLUS", "QMobile S6S": "S6S", "Noir X1S": "X1S", "QMobile X32": "X32", "QMobile X32 Power": "X32 Power", "QMobile X33": "X33", "QMobile X36": "X36", "QMobile X700 PRO": "X700 PRO", "QMobile X700 PRO II": "X700 PRO II", "QMobile X700 PRO Lite": "X700 PRO Lite", "QMobile XLi": "XLi", "QMobile Z10": "Z10", "QMobile i2 POWER": "i2 POWER", "QMobile i2 PRO": "i2 PRO", "QMobile i5.5": "i5.5", "QMobile i6 Metal 2017": "i6 Metal 2017", "QMobile i6 Metal ONE": "i6 Metal One", "QMobile i7i PRO": "i7i PRO", "QMobile i8i PRO": "i8i PRO", "QOOQ": "QOOQV3", "TRUE BEYOND 4G": "True Beyond 4G", "Quantum Fly": "FLY", "Quantum Fit": "Quantum FIT", "Quantum Go": "Go", "GO 2": "Go 2", "Quantum MUV": "Muv", "MUV": "Muv", "Quantum MUV PRO": "MUV PRO", "Quantum MUV UP": "MUV UP", "Quantum Mini": "Mini", "QT-195W-aa2": "QSPT-1952", "twist neo": "Twist Neo", "Quantum V": "V", "Quantum You": "You", "Quantum You 2": "You 2", "Quantum You E": "You E", "QMobile I9i": "i9i", "Quatro 8": "Quatro_8", "M387_QL": "Quickline UHD Box", "RCT6603W47M7": "10 Viking II", "RCT6603W87M7": "10 Viking II Pro", "RCT6303W87DK": "10 Viking Pro", "RCT6303W87M": "10 Viking Pro", "RCT6303W87M7": "10 Viking Pro", "RCT6K03W13": "10 Viking Pro", "RCT6513W87": "11 Galileo Pro", "RCT6213W87DK": "11 Maven Pro", "RCT6673W23M": "7 Mercury", "RCT6673W43M": "7 Mercury", "RCT6873W42": "7 Voyager", "RCT6773W22B": "7 Voyager II", "RCT6773W22BM": "7 Voyager II", "RCT6973W43MD": "7 Voyager III", "RCT6703W12": "Atlas 10", "DAA730R": "DAA730R / RCA DAA738R", "DAA738R": "DAA730R / RCA DAA738R", "CT9973W43M": "Mercury 7", "RCT6203W46L": "Pro10 Edition II", "RCT6223W87": "Pro12", "RCT6213W22": "RCA RCT6213W22", "RCT6213W23": "RCA RCT6213W23", "RCT6213W24": "RCA RCT6213W24", "RCT6703W13": "RCA RCT6703W13", "RCT6B03W12": "RCA RCT6B03W12", "RCT6B83W12": "RCA RCT6B83W12", "RCT6S03W12": "RCA RCT6S03W12", "RCT6S03W14": "RCA RCT6S03W14", "RCT6603W47DK": "RCT6603W47", "RCT6873W42M_F7": "Voyager Pro", "XLDRCAV1": "XLD Series", "H1A1000": "HydrogenONE", "CELL": "Cell", "AMA_A703": "AM_TAB_7_03", "Forge": "Forge TV", "Phone": "Razer phone", "A8i-Q2": "A8i Q2", "M7Plus": "M7 Plus", "reeder_M8S": "M8S", "reeder_T8": "T8", "reeder_M10 Plus": "reeder M10 Plus", "reeder_M7_Go": "reeder M7", "reeder_M8 Plus": "reeder M8 Plus", "P12": "reeder P12", "Rego": "Chocolate", "IPSetTopBox": "MCM3000", "RC505L-RW": "Orbic RC505L-RW", "LS-5010": "Smartphone JS LS-5010", "cp250_gts": "CP250", "DeWalt MD501": "DEWALT MD501", "IMO_S": "IMO S", "RugGear RG730": "RG730", "i7c": "RUIO i7c Tablet", "RUIO_S4": "S4", "SFR-G8800": "G8800", "STARSHINE II": "Star Shine II", "STARTRAIL5": "Star Trail 5", "STARTRAIL6": "Star Trail 6", "StarTrail III": "Star Trail III", "BHX-S100": "B tv smart", "BKO-S200": "B tv smart", "EG668": "EG68BE", "EG978": "EG978TW", "S201": "K2401", "Clear": "T750", "X450-Locked to Life Wireless": "X450", "BLAZE_X500": "BLAZE X500", "SOSMART_T5": "T5", "L51": "L51 BLITZ", "L51 Pro": "L51 PRO", "L52 Pro": "L52 PRO", "L52": "L52 STEEL+", "BLOCK GO": "BLOCK_GO", "Block": "STF-BLOCK", "STK_Hero_X": "Hero X", "STK_Sync_5c": "SYNC 5C", "Storm 2e Plus": "Storm 2e  Plus", "STK Storm 3": "Storm 3", "STK_Sync_5e": "Sync 5e", "STK Sync 5z": "Sync 5z", "STK_Transporter_1": "Transporter 1", "SC-4009DL": "SC4009DL", "SM-A710XZ": "\\t Galaxy A7(2016)", "GT-B9120": "Absolute", "SCH-R880": "Acclaim", "SCH-R720": "Admire", "SGH-S730M": "Amazing", "SHV-E270L": "Baffin", "SAMSUNG-SGH-I927": "Captivate Glide", "SGH-I927": "Captivate Glide", "SCH-I699I": "China Telecom", "Samsung Chromebook 3": "Chromebook 3", "Samsung Chromebook Plus": "Chromebook Plus", "kevin": "Chromebook Plus", "nautilus": "Chromebook Plus (V2)", "Samsung Chromebook Pro": "Chromebook Pro", "caroline": "Chromebook Pro", "SPH-D600": "Conquer", "SAMSUNG-SGH-I857": "DoubleTime", "SCH-I510": "Droid Charge", "SM-G1600": "Elite", "SM-G1650": "Galaxy Folder2", "GT-I5500B": "Europa", "GT-I5500L": "Europa", "GT-I5500M": "Europa", "GT-I5503T": "Europa", "GT-I5510L": "Europa", "SGH-T759": "Exhibit", "EK-GC100": "Galaxy Camera", "GT-B9062": "Galaxy (China)", "YP-GI2": "Galaxy 070", "SHW-M100S": "Galaxy A", "archer": "Galaxy A", "SM-A300H": "Galaxy A3", "SM-A300F": "Galaxy A3", "SM-A300M": "Galaxy A3", "SM-A300XZ": "Galaxy A3", "SM-A300YZ": "Galaxy A3", "SM-A3000": "Galaxy A3", "SM-A300X": "Galaxy A3", "SM-A3009": "Galaxy A3", "SM-A300G": "Galaxy A3", "SM-A300FU": "Galaxy A3", "SM-A300XU": "Galaxy A3", "SM-A300Y": "Galaxy A3", "SM-A320Y": "Galaxy A3 (2017)", "SM-A310F": "Galaxy A3(2016)", "SM-A310M": "Galaxy A3(2016)", "SM-A310X": "Galaxy A3(2016)", "SM-A310Y": "Galaxy A3(2016)", "SM-A310N0": "Galaxy A3(2016)", "SM-A320F": "Galaxy A3(2017)", "SM-A320FL": "Galaxy A3(2017)", "SM-A320X": "Galaxy A3(2017)", "SM-A500H": "Galaxy A5", "SM-A500F": "Galaxy A5", "SM-A500G": "Galaxy A5", "SM-A500M": "Galaxy A5", "SM-A500XZ": "Galaxy A5", "SM-A5000": "Galaxy A5", "SM-A500X": "Galaxy A5", "SM-A5009": "Galaxy A5", "SM-A500YZ": "Galaxy A5", "SM-A500FU": "Galaxy A5", "SM-A500Y": "Galaxy A5", "SM-A500W": "Galaxy A5", "SM-A500K": "Galaxy A5", "SM-A500L": "Galaxy A5", "SM-A500F1": "Galaxy A5", "SM-A500S": "Galaxy A5", "SM-A510Y": "Galaxy A5(2016)", "SM-A510F": "Galaxy A5(2016)", "SM-A510M": "Galaxy A5(2016)", "SM-A510X": "Galaxy A5(2016)", "SM-A5108": "Galaxy A5(2016)", "SM-A510K": "Galaxy A5(2016)", "SM-A510L": "Galaxy A5(2016)", "SM-A510S": "Galaxy A5(2016)", "SM-A5100": "Galaxy A5(2016)", "SM-A5100X": "Galaxy A5(2016)", "SM-A510XZ": "Galaxy A5(2016)", "SM-A520F": "Galaxy A5(2017)", "SM-A520X": "Galaxy A5(2017)", "SM-A520W": "Galaxy A5(2017)", "SM-A520K": "Galaxy A5(2017)", "SM-A520L": "Galaxy A5(2017)", "SM-A520S": "Galaxy A5(2017)", "SM-A600F": "Galaxy A6", "SM-A600FN": "Galaxy A6", "SM-A600G": "Galaxy A6", "SM-A600GN": "Galaxy A6", "SM-A600N": "Galaxy A6", "SM-A605F": "Galaxy A6 Plus", "SM-A6050": "Galaxy A9 Star Lite", "SM-A605FN": "Galaxy A6+", "SM-A605G": "Galaxy A6+", "SM-A605GN": "Galaxy A6+", "SM-A700H": "Galaxy A7", "SM-A700F": "Galaxy A7", "SM-A700FD": "Galaxy A7", "SM-A700X": "Galaxy A7", "SM-A7000": "Galaxy A7", "SM-A700YD": "Galaxy A7", "SM-A7009": "Galaxy A7", "SM-A700K": "Galaxy A7", "SM-A700L": "Galaxy A7", "SM-A700S": "Galaxy A7", "SM-A710F": "Galaxy A7(2016)", "SM-A710M": "Galaxy A7(2016)", "SM-A710X": "Galaxy A7(2016)", "SM-A7108": "Galaxy A7(2016)", "SM-A710K": "Galaxy A7(2016)", "SM-A710L": "Galaxy A7(2016)", "SM-A710S": "Galaxy A7(2016)", "SM-A710Y": "Galaxy A7(2016)", "SM-A7100": "Galaxy A7(2016)", "SM-A720F": "Galaxy A7(2017)", "SM-A720S": "Galaxy A7(2017)", "SCV32": "Galaxy A8", "SM-A800F": "Galaxy A8", "SM-A800YZ": "Galaxy A8", "SM-A800S": "Galaxy A8", "SM-A800I": "Galaxy A8", "SM-A800IZ": "Galaxy A8", "SM-A8000": "Galaxy A8", "SM-A800X": "Galaxy A8", "SM-G885F": "Galaxy A8 Star", "SM-G885Y": "Galaxy A8 Star", "SM-G8850": "Galaxy A9 Star", "SM-G885S": "Galaxy A8 Star", "SM-A810F": "Galaxy A8(2016)", "SM-A810YZ": "Galaxy A8(2016)", "SM-A810S": "Galaxy A8(2016)", "SM-A530F": "Galaxy A8(2018)", "SM-A530X": "Galaxy A8(2018)", "SM-A530W": "Galaxy A8(2018)", "SM-A530N": "Galaxy A8(2018)", "SM-A730F": "Galaxy A8+(2018)", "SM-A730X": "Galaxy A8+(2018)", "SM-A9100": "Galaxy A9 Pro", "SM-A910F": "Galaxy A9 Pro", "SM-G8858": "Galaxy A9 Star", "SM-A605XC": "Galaxy A9 Star Lite", "SM-A6058": "Galaxy A9 Star Lite", "SM-A9000": "Galaxy-A9(2016)", "GT-S5830": "Galaxy Ace", "GT-S5830B": "Galaxy Ace", "GT-S5830C": "Galaxy Ace", "GT-S5830D": "Galaxy Ace", "GT-S5830F": "Galaxy Ace", "GT-S5830G": "Galaxy Ace", "GT-S5830L": "Galaxy Ace", "GT-S5830M": "Galaxy Ace", "GT-S5830T": "Galaxy Ace", "GT-S5830i": "Galaxy Ace", "GT-S5831i": "Galaxy Ace", "GT-S5838": "Galaxy Ace", "GT-S5839i": "Galaxy Ace", "GT-S6358": "Galaxy Ace", "SCH-I619": "Galaxy Ace", "SHW-M240S": "Galaxy Ace", "SM-G310R5": "Galaxy Ace", "SM-G357M": "Galaxy Ace", "SM-G313HU": "Galaxy Ace 4", "SM-G313HY": "Galaxy Ace 4", "SM-G313M": "Galaxy Ace 4", "SM-G313MY": "Galaxy Ace 4", "SM-G313U": "Galaxy Ace 4 Lite", "GT-S6800": "Galaxy Ace Advance", "GT-S6352": "Galaxy Ace Duos", "GT-S6802": "Galaxy Ace Duos", "GT-S6802B": "Galaxy Ace Duos", "SCH-i579": "Galaxy Ace Duos", "SCH-I589": "Galaxy Ace Duos", "SCH-i589": "Galaxy Ace Duos", "GT-S7500": "Galaxy Ace Plus", "GT-S7500L": "Galaxy Ace Plus", "GT-S7500T": "Galaxy Ace Plus", "GT-S7500W": "Galaxy Ace Plus", "GT-S7508": "Galaxy Ace Plus", "SGH-I827D": "Galaxy Ace Q", "SM-S765C": "Galaxy Ace Style", "SM-S766C": "Galaxy Ace Style", "SM-G310HN": "Galaxy Ace Style", "SM-G357FZ": "Galaxy Ace Style", "GT-I8160": "Galaxy Ace2", "GT-I8160L": "Galaxy Ace2", "GT-I8160P": "Galaxy Ace2", "GT-S7560": "Galaxy Ace2 X", "GT-S7560M": "Galaxy Ace2 X", "GT-S7270": "Galaxy Ace3", "GT-S7270L": "Galaxy Ace3", "SCH-I679": "Galaxy Ace3", "GT-S7278": "Galaxy Ace3", "GT-S7272": "Galaxy Ace3", "GT-S7275": "Galaxy S", "GT-S7275B": "Galaxy Ace3", "GT-S7275R": "Galaxy Ace3", "GT-S7275T": "Galaxy Ace3", "GT-S7275Y": "Galaxy Ace3", "GT-S7272C": "Galaxy Ace3 Duos", "GT-S7278U": "Galaxy Ace3 Duos", "GT-S7273T": "Galaxy S2 Duos TV", "SM-G313ML": "Galaxy Ace4", "SM-G316H": "Galaxy Ace4", "SM-G316HU": "Galaxy Ace4", "SM-G316M": "Galaxy Ace4", "SM-G316MY": "Galaxy Ace4", "SM-G313F": "Galaxy Ace4", "SM-G313MU": "Galaxy Ace4", "SM-G313HN": "Galaxy Ace4", "SM-G3139D": "Galaxy Ace4 Lite", "SM-G313H": "Galaxy Ace4 Lite", "SM-G316U": "Galaxy Ace4 Lite", "SM-G318H": "Galaxy Ace4 Lite", "SM-G318ML": "Galaxy Ace4 Lite", "SM-G318HZ": "Galaxy Ace4 Lite", "SM-G318MZ": "Galaxy Ace4 Lite", "SM-G316ML": "Galaxy Ace4 Neo", "SC-01H": "Galaxy Active neo", "SCH-R820": "Galaxy Admire", "SCH-R830C": "Galaxy Admire 2", "SM-G850F": "Galaxy Alpha", "SM-G850FQ": "Galaxy Alpha", "SM-G850M": "Galaxy Alpha", "SM-G850X": "Galaxy Alpha", "SM-G850Y": "Galaxy Alpha", "SAMSUNG-SM-G850A": "Galaxy Alpha", "SM-G850W": "Galaxy Alpha", "SM-G8508S": "Galaxy Alpha", "SM-G850K": "Galaxy Alpha", "SM-G850L": "Galaxy Alpha", "SM-G850S": "Galaxy Alpha", "SAMSUNG-SGH-I407": "Galaxy Amp", "GT-I5800": "Galaxy Apollo", "GT-I5800L": "Galaxy Apollo", "GT-I5800D": "Galaxy Apollo", "GT-I5801": "Galaxy Apollo", "SAMSUNG-SGH-I827": "Galaxy Appeal", "SCH-R920": "Galaxy Attain", "SM-G386T": "Galaxy Avant", "SCH-R830": "Galaxy Axiom", "GT-I8250": "Galaxy Beam", "GT-I8530": "Galaxy Beam", "SM-C5000": "Galaxy C5", "SM-C500X": "Galaxy C5", "SM-C5010": "Galaxy C5 Pro", "SM-C5018": "Galaxy C5 Pro", "SM-C7000": "Galaxy C7", "SM-C700X": "Galaxy C7", "SM-C701X": "Galaxy C7", "SM-C701F": "Galaxy C7 Pro", "SM-C7010": "Galaxy C7 Pro", "SM-C7018": "Galaxy C7 Pro", "SM-C7100": "Galaxy C8", "SM-C710X": "Galaxy C8", "SM-C7108": "Galaxy C8", "SM-C900F": "Galaxy C9 Pro", "SM-C900Y": "Galaxy C9 Pro", "SM-C9000": "Galaxy C9 Pro", "SM-C9008": "Galaxy C9 Pro", "SM-C900X": "Galaxy C9 Pro", "SAMSUNG-EK-GC100": "Galaxy Camera", "EK-KC100K": "Galaxy Camera", "EK-KC120L": "Galaxy Camera", "EK-KC120S": "Galaxy Camera", "EK-GC120": "Galaxy Camera", "EK-KC100S": "Galaxy Camera", "EK-GC110": "Galaxy Camera", "EK-GN100": "Galaxy Camera", "EK-GN120": "Galaxy NX", "EK-GC200": "Galaxy Camera 2", "SCH-S738C": "Galaxy Centura", "GT-B5330": "Galaxy Chat", "GT-B5330B": "Galaxy Chat", "GT-B5330L": "Galaxy Chat", "SM-G386T1": "Galaxy Core", "SM-G386W": "Galaxy Core", "GT-I8262": "Galaxy Core", "GT-I8260": "Galaxy Core", "GT-I8260L": "Galaxy Core", "SM-G355H": "Galaxy Core2", "GT-I8580": "Galaxy Core Advance", "SHW-M570S": "Galaxy Core Advance", "SM-G386F": "Galaxy Core LTE", "SM-G3518": "Galaxy Core LTE", "SM-G3586V": "Galaxy Core Lite", "SM-G3589W": "Galaxy Core Lite", "SM-G5108": "Galaxy Core Max", "SM-G5108Q": "Galaxy Core Max Duos", "SM-G350": "Galaxy Core Plus", "SM-G3502": "Galaxy Core Plus", "SM-G3502L": "Galaxy Core Plus", "SM-G3502T": "Galaxy Core Plus", "SM-G350L": "Galaxy Core Plus", "SM-G350M": "Galaxy Core Plus", "SM-G360H": "Galaxy Core Prime", "SM-G360HU": "Galaxy Core Prime", "SM-G360F": "Galaxy Core Prime", "SM-G360FY": "Galaxy Core Prime", "SM-G360M": "Galaxy Core Prime", "SAMSUNG-SM-G360AZ": "Galaxy Core Prime", "SM-G360R6": "Galaxy Core Prime", "SM-G360P": "Galaxy Core Prime", "SM-S820L": "Galaxy Core Prime", "SM-G360V": "Galaxy Core Prime", "SM-G361H": "Galaxy Core Prime", "SM-G361HU": "Galaxy Core Prime", "SM-G361F": "Galaxy Core Prime", "SM-G361M": "Galaxy Core Prime", "SM-G360T1": "Galaxy Core Prime", "SM-G360T": "Galaxy Core Prime", "SM-G3606": "Galaxy Core Prime", "SM-G3608": "Galaxy Core Prime", "SM-G3609": "Galaxy Core Prime", "SM-G360GY": "Galaxy Core Prime", "GT-I8260E": "Galaxy Core Safe", "SHW-M580D": "Galaxy Core Safe", "SHW-M585D": "Galaxy Core Safe", "SM-G355HQ": "Galaxy Core2", "SM-G355M": "Galaxy Core2", "SM-G3556D": "Galaxy Core2", "SM-G3558": "Galaxy Core2", "SM-G3559": "Galaxy Core2", "SM-G355HN": "Galaxy Core2", "SCH-R740C": "Galaxy Discover", "SCH-S735C": "Galaxy Discover", "GT-I8268": "Galaxy Duos", "SM-E500H": "Galaxy E5", "SM-E500F": "Galaxy E5", "SM-E500M": "Galaxy E5", "SM-S978L": "Galaxy E5", "SM-E500YZ": "Galaxy E5", "SM-E700H": "Galaxy E7", "SM-E700F": "Galaxy E7", "SM-E700M": "Galaxy E7", "SM-E7000": "Galaxy E7", "SM-E7009": "Galaxy E7", "SM-G165N": "Galaxy Elite", "SM-G160N": "Galaxy Elite", "GT-I5500": "Galaxy Europa", "GT-I5503": "Galaxy Europa", "GT-I5508": "Galaxy Europa", "GT-I5510": "Galaxy Europa", "SGH-T599N": "Galaxy Exhibit", "SGH-T599": "Galaxy Exhibit", "SGH-T599V": "Galaxy Exhibit", "SGH-T679": "Galaxy Exhibit2", "SAMSUNG-SGH-I577": "Galaxy Exhilarate", "SAMSUNG-SGH-I437": "Galaxy Express", "SAMSUNG-SGH-I437P": "Galaxy Express", "GT-I8730": "Galaxy Express", "GT-I8730T": "Galaxy Express", "SAMSUNG-SGH-I437Z": "Galaxy Express", "SM-G3815": "Galaxy Express2", "SCH-I629": "Galaxy Fame", "GT-S6810": "Galaxy Fame", "GT-S6810B": "Galaxy Fame", "GT-S6810E": "Galaxy Fame", "GT-S6810L": "Galaxy Fame", "GT-S6812i": "Galaxy Fame", "GT-S6818": "Galaxy Fame", "GT-S6818V": "Galaxy Fame", "GT-S6812": "Galaxy Fame", "GT-S6812B": "Galaxy Fame", "GT-S6790N": "Galaxy Fame", "GT-S6810M": "Galaxy Fame", "GT-S6810P": "Galaxy Fame", "GT-S6790": "Galaxy Fame", "GT-S6790E": "Galaxy Fame", "GT-S6790L": "Galaxy Fame", "GT-S6812C": "Galaxy Fame", "GT-S6792L": "Galaxy Fame Lite Duos", "SC-04J": "Galaxy Feel", "GT-S5670": "Galaxy Fit", "GT-S5670B": "Galaxy Fit", "GT-S5670L": "Galaxy Fit", "SM-G155S": "Galaxy Folder", "SM-G150NK": "Galaxy Folder", "SM-G150N0": "Galaxy Folder", "SM-G150NL": "Galaxy Folder", "SM-G150NS": "Galaxy Folder", "GT-S7390": "Galaxy Trend Lite", "GT-S7390E": "Galaxy Fresh", "GT-S7390G": "Galaxy Fresh", "GT-S5660": "Galaxy Gio", "GT-S5660B": "Galaxy Gio", "GT-S5660L": "Galaxy Gio", "GT-S5660M": "Galaxy Gio", "GT-S5660V": "Galaxy Gio", "SCH-i569": "Galaxy Gio", "SHW-M290K": "Galaxy Gio", "SHW-M290S": "Galaxy Gio", "SAMSUNG-SM-G530A": "Galaxy Go Prime", "GT-I9230": "Galaxy Golden", "GT-I9235": "Galaxy Golden", "SHV-E400K": "Galaxy Golden", "SHV-E400S": "Galaxy Golden", "SM-W2015": "Galaxy Golden 2", "SCH-I879": "Galaxy Grand", "GT-I9128": "Galaxy Grand", "GT-I9128V": "Galaxy Grand", "SHV-E270K": "Galaxy Grand", "SHV-E270S": "Galaxy Grand", "GT-I9118": "Galaxy Grand", "GT-I9080E": "Galaxy Grand", "GT-I9080L": "Galaxy Grand", "SHV-E275K": "Galaxy Grand", "SHV-E275S": "Galaxy Grand", "GT-I9128E": "Galaxy Grand", "GT-I9128I": "Galaxy Grand", "GT-I9082": "Galaxy Grand Duos", "GT-I9082L": "Galaxy Grand Duos", "SM-G7202": "Galaxy Grand Max", "SM-G7200": "Galaxy Grand Max", "SM-G720AX": "Galaxy Grand Max", "GT-I9060": "Galaxy Grand Neo", "GT-I9060L": "Galaxy Grand Neo", "GT-I9082C": "Galaxy Grand Neo", "GT-I9063T": "Galaxy Grand Neo", "GT-I9168": "Galaxy Grand Neo", "GT-I9168I": "Galaxy Grand Neo", "GT-I9060C": "Galaxy Grand Neo Plus", "GT-I9060I": "Galaxy Grand Neo Plus", "GT-I9060M": "Galaxy Grand Neo Plus", "SCH-I879E": "Galaxy Grand Neo+", "SM-G530H": "Galaxy Grand Prime", "SM-G530BT": "Galaxy Grand Prime", "SM-G5306W": "Galaxy Grand Prime", "SM-G5308W": "Galaxy Grand Prime", "SM-G530F": "Galaxy Grand Prime", "SM-G530M": "Galaxy Grand Prime", "SM-G5309W": "Galaxy Grand Prime", "SM-G530MU": "Galaxy Grand Prime", "SM-G530Y": "Galaxy Grand Prime", "SM-G530R7": "Galaxy Grand Prime", "gprimelteacg": "Galaxy Grand Prime", "SM-G530W": "Galaxy Grand Prime", "SM-G530T1": "Galaxy Grand Prime", "SM-G530P": "Galaxy Grand Prime", "SM-S920L": "Galaxy Grand Prime", "SM-G530T": "Galaxy Grand Prime", "SM-G530R4": "Galaxy Grand Prime", "SM-G530FZ": "Galaxy Grand Prime", "SAMSUNG-SM-G530AZ": "Galaxy Grand Prime", "SM-G531H": "Galaxy Grand Prime", "SM-G531BT": "Galaxy Grand Prime", "SM-G531F": "Galaxy Grand Prime", "SM-G531M": "Galaxy Grand Prime", "SM-G531Y": "Galaxy Grand Prime", "SM-G532F": "Galaxy Grand Prime Plus", "SM-G532MT": "Galaxy Grand Prime Plus", "SM-J250F": "Galaxy J2 (2018)", "GT-I9082i": "Galaxy Grand duos", "SM-G720N0": "Galaxy Grand-Max", "SM-G7102": "Galaxy Grand2", "SM-G7106": "Galaxy Grand2", "SM-G7108": "Galaxy Grand2", "SM-G7109": "Galaxy Grand2", "SM-G7102T": "Galaxy Grand2", "SM-G710": "Galaxy Grand2", "SM-G7105": "Galaxy Grand2", "SM-G7105H": "Galaxy Grand2", "SM-G7105L": "Galaxy Grand2", "SM-G710K": "Galaxy Grand2", "SM-G710L": "Galaxy Grand2", "SM-G710S": "Galaxy Grand2", "SCH-R910": "Galaxy Indulge", "SCH-R915": "Galaxy Indulge", "SCH-I759": "Galaxy Infinite", "SGH-N075T": "Galaxy J", "SM-J100H": "Galaxy J1", "SM-J100ML": "Galaxy J1", "SM-S777C": "Galaxy J1", "SM-J100F": "Galaxy J1", "SM-J100G": "Galaxy J1", "SM-J100M": "Galaxy J1", "SM-J100FN": "Galaxy J1", "SM-J100MU": "Galaxy J1", "SM-J100Y": "Galaxy J1", "SM-J100VPP": "Galaxy J1", "SM-J120F": "Galaxy J1", "SM-J120FN": "Galaxy J1", "SM-J120M": "Galaxy J1", "SAMSUNG-SM-J120AZ": "Galaxy J1", "SAMSUNG-SM-J120A": "Galaxy J1", "SM-J120W": "Galaxy J1", "SM-J120P": "Galaxy J1", "SM-S120VL": "Galaxy J1", "SM-J110F": "Galaxy J1 Ace", "SM-J110G": "Galaxy J1 Ace", "SM-J110M": "Galaxy J1 Ace", "SM-J111F": "Galaxy J1 Ace", "SM-J111M": "Galaxy J1 Ace", "SM-J110H": "Galaxy J1 Ace", "SM-J110L": "Galaxy J1 Ace", "SM-J105B": "Galaxy J1 Mini", "SM-J105H": "Galaxy J1 Mini", "SM-J105F": "Galaxy J1 Mini", "SM-J105M": "Galaxy J1 Mini", "SM-J105Y": "Galaxy J1 Mini", "SM-J106B": "Galaxy J1 Mini Prime", "SM-J106H": "Galaxy J1 Mini Prime", "SM-J106M": "Galaxy J1 Mini Prime", "SM-J120H": "Galaxy J1(2016)", "SM-J120G": "Galaxy J1(2016)", "SM-J120ZN": "Galaxy J1(2016)", "SM-J200H": "Galaxy J2", "SM-J200F": "Galaxy J2", "SM-J200G": "Galaxy J2", "SM-J200GU": "Galaxy J2", "SM-J200M": "Galaxy J2", "SM-J200Y": "Galaxy J2", "SM-J200BT": "Galaxy J2", "SM-J250Y": "Galaxy J2", "SM-J260G": "Galaxy J2 Core", "SM-G532G": "Galaxy J2 Prime", "SM-G532M": "Galaxy J2 Prime", "SM-J250G": "Galaxy J2 Pro", "SM-J250M": "Galaxy J2 Pro", "SM-J210F": "Galaxy J2(2016)", "SM-J3109": "Galaxy J3", "SM-J320P": "Galaxy J3", "SM-J327U": "Galaxy J3", "SM-J337VPP": "Galaxy J3", "SM-J320H": "Galaxy J3", "SM-J3300": "Galaxy J3", "SM-J3308": "Galaxy J3", "SM-J337P": "Galaxy J3 Achieve", "SM-J327V": "Galaxy J3 Eclipse", "SM-J327P": "Galaxy J3 Emerge", "SM-J327VPP": "Galaxy J3 Mission", "SAMSUNG-SM-J326AZ": "Galaxy J3 Pop", "SAMSUNG-SM-J327AZ": "Galaxy J3 Pop", "SAMSUNG-SM-J327A": "Galaxy J3 Pop", "SM-J327W": "Galaxy J3 Pop", "SM-S337TL": "Galaxy J3 Pop", "SM-J327R7": "Galaxy J3 Pop", "SM-J327R6": "Galaxy J3 Pop", "SM-S327VL": "Galaxy J3 Pop", "SM-J327R4": "Galaxy J3 Pop", "SM-J327T1": "Galaxy J3 Prime", "SM-J327T": "Galaxy J3 Prime", "SM-J3119S": "Galaxy J3 Pro", "SM-J3110": "Galaxy J3 Pro", "SM-J3119": "Galaxy J3 Pro", "SM-J330G": "Galaxy J3 Pro", "SM-J337T": "Galaxy J3 Star", "SM-J336AZ": "Galaxy J3 Top", "SM-J337AZ": "Galaxy J3 Top", "SM-J337A": "Galaxy J3 Top", "SM-S357BL": "Galaxy J3 Top", "SM-J337V": "Galaxy J3 V", "SM-J320N0": "Galaxy J3(2016)", "SM-S320VL": "Galaxy J3(2016)", "SM-J320Y": "Galaxy J3(2016)", "SM-J320YZ": "Galaxy J3(2016)", "SM-J320R4": "Galaxy J3(2016)", "SM-J320V": "Galaxy J3(2016)", "SM-J320VPP": "Galaxy J3(2016)", "SM-J320ZN": "Galaxy J3(2016)", "SM-J320F": "Galaxy J3(2016)", "SM-J320G": "Galaxy J3(2016)", "SM-J320M": "Galaxy J3(2016)", "SAMSUNG-SM-J320AZ": "Galaxy J3(2016)", "SAMSUNG-SM-J321AZ": "Galaxy J3(2016)", "SAMSUNG-SM-J320A": "Galaxy J3(2016)", "SM-J320W8": "Galaxy J3(2016)", "SM-J320FN": "Galaxy J3(2016)", "SM-J330F": "Galaxy J3(2017)", "SM-J330FN": "Galaxy J3(2017)", "SM-J330N": "Galaxy J3(2017)", "SM-J330L": "Galaxy J3(2017)", "SM-J400F": "Galaxy J4", "SM-J400G": "Galaxy J4", "SM-J400M": "Galaxy J4", "SM-J500H": "Galaxy J5", "SM-J5007": "Galaxy J5", "SM-J500F": "Galaxy J5", "SM-J500G": "Galaxy J5", "SM-J500M": "Galaxy J5", "SM-J5008": "Galaxy J5", "SM-J500N0": "Galaxy J5", "SM-J500FN": "Galaxy J5", "SM-J530F": "Galaxy J5", "SM-J530FM": "Galaxy J5", "SM-J530K": "Galaxy J5", "SM-J530L": "Galaxy J5", "SM-J530S": "Galaxy J5", "SM-J500Y": "Galaxy J5", "SM-G570F": "Galaxy J5 Prime", "SM-G570M": "Galaxy J5 Prime", "SM-G570Y": "Galaxy J5 Prime", "SM-G5700": "Galaxy On5(2016)", "SM-J530G": "Galaxy J5 Pro", "SM-J530GM": "Galaxy J5 Pro", "SM-J530Y": "Galaxy J5 Pro", "SM-J530YM": "Galaxy J5 Pro", "SM-J510H": "Galaxy J5(2016)", "SM-J5108": "Galaxy J5(2016)", "SM-J510F": "Galaxy J5(2016)", "SM-J510FN": "Galaxy J5(2016)", "SM-J510FQ": "Galaxy J5(2016)", "SM-J510GN": "Galaxy J5(2016)", "SM-J510MN": "Galaxy J5(2016)", "SM-J510UN": "Galaxy J5(2016)", "SM-J510K": "Galaxy J5(2016)", "SM-J510L": "Galaxy J5(2016)", "SM-J510S": "Galaxy J5(2016)", "SM-J600F": "Galaxy J6", "SM-J600FN": "Galaxy J6", "SM-J600G": "Galaxy J6", "SM-J600GT": "Galaxy J6", "SM-J600N": "Galaxy J6", "SM-J600L": "Galaxy J6", "SM-J700K": "Galaxy J7", "SM-J700H": "Galaxy J7", "SM-J700F": "Galaxy J7", "SM-J700M": "Galaxy J7", "SM-J7008": "Galaxy J7", "SM-J727R4": "Galaxy J7", "SM-J727VPP": "Galaxy J7", "SM-J737VPP": "Galaxy J7", "SM-J730F": "Galaxy J7", "SM-J730FM": "Galaxy J7", "SM-J720F": "Galaxy J7 Duo", "SM-J720M": "Galaxy J7 Duo", "SM-G615F": "Galaxy J7 Max", "SM-J701F": "Galaxy J7 Neo", "SM-J701M": "Galaxy J7 Neo", "SM-J701MT": "Galaxy J7 Neo", "SM-J727P": "Galaxy J7 Perx", "SAMSUNG-SM-J727AZ": "Galaxy J7 Pop", "SAMSUNG-SM-J727A": "Galaxy J7 Pop", "SM-S737TL": "Galaxy J7 Pop", "SM-J727U": "Galaxy J7 Pop", "SM-S727VL": "Galaxy J7 Pop", "SM-J727T1": "Galaxy J7 Prime", "SM-J727T": "Galaxy J7 Prime", "SM-G610F": "Galaxy On Nxt", "SM-G610M": "Galaxy J7 Prime", "SM-G610Y": "Galaxy J7 Prime", "SM-G6100": "Galaxy On7(2016)", "SM-G611M": "Galaxy J7 Prime2", "SM-G611MT": "Galaxy J7 Prime2", "SM-G611FF": "Galaxy J7 Prime2", "SM-J730G": "Galaxy J7 Pro", "SM-J730GM": "Galaxy J7 Pro", "SM-J737P": "Galaxy J7 Refine", "SM-J737T": "Galaxy J7 Star", "SM-J737A": "Galaxy J7 Top", "SM-S757BL": "Galaxy J7 Top", "SM-J727V": "Galaxy J7 V", "SM-J737V": "Galaxy J7 V", "SM-J700P": "Galaxy J7(2015)", "SM-J700T1": "Galaxy J7(2016)", "SM-J700T": "Galaxy J7(2016)", "SM-J710F": "Galaxy J7(2016)", "SM-J710FQ": "Galaxy J7(2016)", "SM-J710GN": "Galaxy J7(2016)", "SM-J710MN": "Galaxy J7(2016)", "SM-J7108": "Galaxy J7(2016)", "SM-J710K": "Galaxy J7(2016)", "SM-J7109": "Galaxy J7(2016)", "SM-J730K": "Galaxy J7(2017)", "SM-C710F": "Galaxy J7+", "SM-J810F": "Galaxy J8", "SM-J810G": "Galaxy J8", "SM-J810M": "Galaxy J8", "SM-J810Y": "Galaxy J8", "SM-A605K": "Galaxy Jean", "SHW-M130K": "Galaxy K", "SM-C111": "Galaxy K Zoom", "SM-C111M": "Galaxy K Zoom", "SM-C115": "Galaxy K Zoom", "SM-C115M": "Galaxy K Zoom", "SM-C115W": "Galaxy K Zoom", "SM-C115L": "Galaxy K Zoom", "GT-B7810": "Galaxy M Pro2", "SHW-M340L": "Galaxy M Style", "SHW-M340S": "Galaxy M Style", "GT-I8258": "Galaxy M Style", "SM-G750H": "Galaxy Mega2", "GT-I9152": "Galaxy Mega 5.8", "SCH-P709": "Galaxy Mega 5.8", "GT-I9150": "Galaxy Mega 5.8", "GT-I9158": "Galaxy Mega 5.8", "GT-I9200": "Galaxy Mega 6.3", "GT-I9208": "Galaxy Mega 6.3", "SCH-P729": "Galaxy Mega 6.3", "GT-I9205": "Galaxy Mega 6.3", "SGH-M819N": "Galaxy Mega 6.3", "SAMSUNG-SGH-I527": "Galaxy Mega 6.3", "SGH-I527M": "Galaxy Mega 6.3", "SHV-E310K": "Galaxy Mega 6.3", "SHV-E310L": "Galaxy Mega 6.3", "SHV-E310S": "Galaxy Mega 6.3", "SPH-L600": "Galaxy Mega 6.3", "SCH-R960": "Galaxy Mega 6.3", "GT-I9152P": "Galaxy Mega Plus", "GT-I9158P": "Galaxy Mega Plus", "GT-I9158V": "Galaxy Mega Plus", "SM-G750F": "Galaxy Mega2", "SAMSUNG-SM-G750A": "Galaxy Mega2", "SM-G7508Q": "Galaxy Mega2", "GT-S5570": "Galaxy Mini", "GT-S5570B": "Galaxy Mini", "GT-S5570I": "Galaxy Mini", "GT-S5570L": "Galaxy Mini", "GT-S5578": "Galaxy Mini", "SGH-T499": "Galaxy Mini", "SGH-T499V": "Galaxy Mini", "SGH-T499Y": "Galaxy Mini", "GT-S6500": "Galaxy Mini2", "GT-S6500D": "Galaxy Mini2", "GT-S6500L": "Galaxy Mini2", "GT-S6500T": "Galaxy Mini2", "GT-S6010": "Galaxy Music", "GT-S6010L": "Galaxy Music", "GT-S6012": "Galaxy Music Duos", "GT-S6012B": "Galaxy Music Duos", "EK-GN120A": "Galaxy NX", "SHW-M220L": "Galaxy Neo", "Galaxy X": "Galaxy Nexus", "GT-I9220": "Galaxy Note", "GT-I9228": "Galaxy Note", "GT-N7000": "Galaxy Note", "GT-N7005": "Galaxy Note", "SC-05D": "Galaxy Note", "SCH-i889": "Galaxy Note", "SAMSUNG-SGH-I717": "Galaxy Note", "SGH-I717": "Galaxy Note", "SGH-I717D": "Galaxy Note", "SGH-I717M": "Galaxy Note", "SGH-I717R": "Galaxy Note", "SGH-T879": "Galaxy Note", "SHV-E160K": "Galaxy Note", "SHV-E160L": "Galaxy Note", "SHV-E160S": "Galaxy Note", "SM-P601": "Galaxy Note 10.1 2014 Edition", "SM-P602": "Galaxy Note 10.1", "SM-P605K": "Galaxy Note 10.1", "SM-P605L": "Galaxy Note 10.1", "SM-P605S": "Galaxy Note 10.1", "GT-N8020": "Galaxy Note 10.1", "SHV-E230K": "Galaxy Note 10.1", "SHV-E230L": "Galaxy Note 10.1", "SHV-E230S": "Galaxy Note 10.1", "SPH-P600": "Galaxy Note 10.1", "SCH-I925U": "Galaxy Note 10.1", "SCH-I925": "Galaxy Note 10.1", "GT-N8000": "Galaxy Note 10.1", "GT-N8005": "Galaxy Note 10.1", "SHW-M480K": "Galaxy Note 10.1", "GT-N8013": "Galaxy Note 10.1", "SHW-M486W": "Galaxy Note 10.1", "SHW-M480W": "Galaxy Note 10.1", "SHW-M485W": "Galaxy Note 10.1", "GT-N8010": "Galaxy Note 10.1", "SM-P605": "Galaxy Note 10.1 2014 Edition", "SM-P605M": "Galaxy Note 10.1 2014 Edition", "SM-P607T": "Galaxy Note 10.1 2014 Edition", "SM-P605V": "Galaxy Note 10.1 2014 Edition", "SM-P600": "Galaxy Note 10.1 2014 Edition", "GT-N5100": "Galaxy Note 8.0", "GT-N5105": "Galaxy Note 8.0", "GT-N5120": "Galaxy Note 8.0", "SAMSUNG-SGH-I467": "Galaxy Note 8.0", "SGH-I467M": "Galaxy Note 8.0", "GT-N5110": "Galaxy Note 8.0", "SHW-M500W": "Galaxy Note 8.0", "SC-01G": "Galaxy Note Edge", "SCL24": "Galaxy Note Edge", "SM-N915K": "Galaxy Note Edge", "SM-N915L": "Galaxy Note Edge", "SM-N915S": "Galaxy Note Edge", "SM-N9150": "Galaxy Note Edge", "SM-N915F": "Galaxy Note Edge", "SM-N915FY": "Galaxy Note Edge", "SM-N915G": "Galaxy Note Edge", "SM-N915X": "Galaxy Note Edge", "SAMSUNG-SM-N915A": "Galaxy Note Edge", "SM-N915W8": "Galaxy Note Edge", "SM-N915P": "Galaxy Note Edge", "SM-N915T": "Galaxy Note Edge", "SM-N915T3": "Galaxy Note Edge", "SM-N915R4": "Galaxy Note Edge", "SM-N915V": "Galaxy Note Edge", "SM-N935F": "Galaxy Note Fan Edition", "SM-N935K": "Galaxy Note Fan Edition", "SM-N935L": "Galaxy Note Fan Edition", "SM-N935S": "Galaxy Note Fan Edition", "SAMSUNG-SGH-I317": "Galaxy Note2", "SM-P901": "Galaxy Note Pro 12.2", "SM-P900": "Galaxy Note Pro 12.2", "SM-P905": "Galaxy Note Pro 12.2", "SM-P905M": "Galaxy Note Pro 12.2", "SAMSUNG-SM-P907A": "Galaxy Note Pro 12.2", "SM-P905F0": "Galaxy Note Pro 12.2", "SM-P905V": "Galaxy Note Pro 12.2", "SC-02E": "Galaxy Note2", "GT-N7100": "Galaxy Note2", "GT-N7100T": "Galaxy Note2", "GT-N7102": "Galaxy Note2", "GT-N7102i": "Galaxy Note2", "GT-N7108": "Galaxy Note2", "SCH-N719": "Galaxy Note2", "GT-N7105": "Galaxy Note2", "GT-N7105T": "Galaxy Note2", "SGH-I317M": "Galaxy Note2", "SGH-T889V": "Galaxy Note2", "GT-N7108D": "Galaxy Note2", "SHV-E250K": "Galaxy Note2", "SHV-E250L": "Galaxy Note2", "SHV-E250S": "Galaxy Note2", "SPH-L900": "Galaxy Note2", "SGH-T889": "Galaxy Note2", "SCH-R950": "Galaxy Note2", "SCH-I605": "Galaxy Note2", "SC-01F": "Galaxy Note3", "SC-02F": "Galaxy Note3", "SCL22": "Galaxy Note3", "SM-N900": "Galaxy Note3", "SM-N9000Q": "Galaxy Note3", "SM-N9005": "Galaxy Note3", "SM-N9006": "Galaxy Note3", "SM-N9007": "Galaxy Note3", "SM-N9008V": "Galaxy Note3", "SM-N9009": "Galaxy Note3", "SM-N900U": "Galaxy Note3", "SAMSUNG-SM-N900A": "Galaxy Note3", "SM-N900W8": "Galaxy Note3", "SM-N900K": "Galaxy Note3", "SM-N900L": "Galaxy Note3", "SM-N900S": "Galaxy Note3", "SM-N900P": "Galaxy Note3", "SM-N900T": "Galaxy Note3", "SM-N900R4": "Galaxy Note3", "SM-N900V": "Galaxy Note3", "SM-N9002": "Galaxy Note3 Duos", "SM-N9008": "Galaxy Note3 Duos", "SM-N750K": "Galaxy Note3 Neo", "SM-N750L": "Galaxy Note3 Neo", "SM-N750S": "Galaxy Note3 Neo", "SM-N750": "Galaxy Note3 Neo", "SM-N7500Q": "Galaxy Note3 Neo", "SM-N7502": "Galaxy Note3 Neo", "SM-N7505": "Galaxy Note3 Neo", "SM-N7505L": "Galaxy Note3 Neo", "SM-N7507": "Galaxy Note3 Neo", "SM-N916K": "Galaxy Note4", "SM-N916L": "Galaxy Note4", "SM-N916S": "Galaxy Note4", "SM-N910H": "Galaxy Note4", "SM-N910C": "Galaxy Note4", "SM-N910K": "Galaxy Note4", "SM-N910L": "Galaxy Note4", "SM-N910S": "Galaxy Note4", "SM-N910U": "Galaxy Note4", "SM-N910F": "Galaxy Note4", "SM-N910G": "Galaxy Note4", "SM-N910X": "Galaxy Note4", "SAMSUNG-SM-N910A": "Galaxy Note4", "SM-N910W8": "Galaxy Note4", "SM-N9100": "Galaxy Note4", "SM-N9106W": "Galaxy Note4", "SM-N9108V": "Galaxy Note4", "SM-N9109W": "Galaxy Note4", "SM-N910P": "Galaxy Note4", "SM-N910T": "Galaxy Note4", "SM-N910T2": "Galaxy Note4", "SM-N910T3": "Galaxy Note4", "SM-N910R4": "Galaxy Note4", "SM-N910V": "Galaxy Note4", "SM-N9208": "Galaxy Note5", "SM-N920C": "Galaxy Note5", "SM-N920F": "Galaxy Note5", "SM-N920G": "Galaxy Note5", "SM-N920I": "Galaxy Note5", "SM-N920X": "Galaxy Note5", "SM-N920R7": "Galaxy Note5", "SAMSUNG-SM-N920A": "Galaxy Note5", "SM-N920W8": "Galaxy Note5", "SM-N9200": "Galaxy Note5", "SM-N920K": "Galaxy Note5", "SM-N920L": "Galaxy Note5", "SM-N920R6": "Galaxy Note5", "SM-N920S": "Galaxy Note5", "SM-N920P": "Galaxy Note5", "SM-N920T": "Galaxy Note5", "SM-N920R4": "Galaxy Note5", "SM-N920V": "Galaxy Note5", "SC-01J": "Galaxy Note7", "SCV34": "Galaxy Note7", "SM-N930F": "Galaxy Note7", "SM-N930X": "Galaxy Note7", "SM-N930K": "Galaxy Note7", "SM-N930L": "Galaxy Note7", "SM-N930S": "Galaxy Note7", "SM-N930R7": "Galaxy Note7", "SAMSUNG-SM-N930A": "Galaxy Note7", "SM-N930W8": "Galaxy Note7", "SM-N9300": "Galaxy Note7", "SGH-N037": "Galaxy Note7", "SM-N930R6": "Galaxy Note7", "SM-N930P": "Galaxy Note7", "SM-N930VL": "Galaxy Note7", "SM-N930T": "Galaxy Note7", "SM-N930U": "Galaxy Note7", "SM-N930R4": "Galaxy Note7", "SM-N930V": "Galaxy Note7", "SC-01K": "Galaxy Note8", "SCV37": "Galaxy Note8", "SM-N950F": "Galaxy Note8", "SM-N950N": "Galaxy Note8", "SM-N950XN": "Galaxy Note8", "SM-N950U": "Galaxy Note8", "SM-N9500": "Galaxy Note8", "SM-N9508": "Galaxy Note8", "SM-N950W": "Galaxy Note8", "SM-N950U1": "Galaxy Note8", "SM-N960F": "Galaxy Note9", "SM-N960N": "Galaxy Note9", "SM-N9600": "Galaxy Note9", "SM-N960W": "Galaxy Note9", "SM-N960U": "Galaxy Note9", "SM-N960U1": "Galaxy Note9", "SM-G615FU": "Galaxy On Max", "SM-G550FY": "Galaxy On5 Pro", "SM-G5500": "Galaxy On5", "SM-G550T1": "Galaxy On5", "SM-S550TL": "Galaxy On5", "SM-G550T": "Galaxy On5", "SM-G550T2": "Galaxy On5", "SM-G5520": "Galaxy On5(2016)", "SM-G5528": "Galaxy On5(2016)", "SM-G5510": "Galaxy On5(2016)", "SM-J600GF": "Galaxy On6", "SM-G600FY": "Galaxy On7 Pro", "SM-G6000": "Galaxy On7", "SM-G600F": "Galaxy On7", "SM-G611F": "Galaxy On7 Prime", "SM-G611K": "Galaxy On7 Refresh", "SM-G611L": "Galaxy On7 Refresh", "SM-G611S": "Galaxy On7 Refresh", "SM-G610K": "Galaxy On7(2016)", "SM-G610L": "Galaxy On7(2016)", "SM-G610S": "Galaxy On7(2016)", "SM-J710FN": "Galaxy On8", "SM-J810GF": "Galaxy On8", "YP-GB70": "Galaxy Player", "YP-GS1": "Galaxy Player 3.6", "YP-GB1": "Galaxy Player 4", "YP-G1": "Galaxy Player 4.0", "YP-GI1": "Galaxy Player 4.2", "YP-G70": "Galaxy Player 5", "YP-GP1": "Galaxy Player 5.8", "YP-G50": "Galaxy Player 50", "GT-S5300": "Galaxy Pocket", "GT-S5300B": "Galaxy Pocket", "GT-S5300L": "Galaxy Pocket", "GT-S5302": "Galaxy Pocket", "GT-S5302B": "Galaxy Pocket", "GT-S5301": "Galaxy Pocket Plus", "GT-S5303": "Galaxy Y Plus", "GT-S5312": "Galaxy Pocket Neo", "GT-S5312B": "Galaxy Pocket Neo", "GT-S5312L": "Galaxy Pocket Neo", "GT-S5310": "Galaxy Pocket Neo", "GT-S5310B": "Galaxy Pocket Neo", "GT-S5310E": "Galaxy Pocket Neo", "GT-S5310G": "Galaxy Pocket Neo", "GT-S5310L": "Galaxy Pocket Neo", "GT-S5310T": "Galaxy Pocket Neo", "GT-S5310I": "Galaxy Pocket Neo", "GT-S5310N": "Galaxy Pocket Neo", "GT-S5312C": "Galaxy Pocket Neo", "GT-S5312M": "Galaxy Pocket Neo", "SAMSUNG-SGH-I747Z": "Galaxy Pocket Neo", "GT-S5301B": "Galaxy Pocket Plus", "GT-S5301L": "Galaxy Pocket Plus", "GT-S5310C": "Galaxy Pocket SS", "GT-S5310M": "Galaxy Pocket SS", "SM-G110B": "Galaxy Pocket2", "SM-G110M": "Galaxy Pocket2", "SM-G110H": "Galaxy Pocket2", "SHV-E220S": "Galaxy Pop", "SCH-i559": "Galaxy Pop (CDMA)", "SCH-M828C": "Galaxy Precedent", "GT-I9260": "Galaxy Premier", "GT-I9268": "Galaxy Premier", "SPH-M820-BST": "Galaxy Prevail", "SPH-M840": "Galaxy Prevail2", "GT-B7510": "Galaxy Pro", "GT-B7510B": "Galaxy Pro", "GT-B7510L": "Galaxy Pro", "SCH-S720C": "Galaxy Proclaim", "SGH-T589": "Galaxy Q", "SGH-T589R": "Galaxy Q", "SGH-T589W": "Galaxy Q", "SHV-E170K": "Galaxy R-Style", "SHV-E170L": "Galaxy R-Style", "SHV-E170S": "Galaxy R-Style", "SPH-M950": "Galaxy Reverb", "SM-G910S": "Galaxy Round", "SGH-I547C": "Galaxy Rugby", "SAMSUNG-SGH-I547": "Galaxy Rugby Pro", "SPH-M830": "Galaxy Rush", "GT-I9000": "Galaxy S", "GT-I9000B": "Galaxy S", "GT-I9000M": "Galaxy S", "GT-I9000T": "Galaxy S", "GT-I9003": "Galaxy S", "GT-I9003L": "Galaxy S", "GT-I9008L": "Galaxy S", "GT-I9010": "Galaxy S", "GT-I9018": "Galaxy S", "GT-I9050": "Galaxy S", "SC-02B": "Galaxy S", "SCH-I500": "Galaxy S", "SCH-S950C": "Galaxy S", "SCH-i909": "Galaxy S", "SAMSUNG-SGH-I897": "Galaxy S", "SGH-T959V": "Galaxy S", "SGH-T959W": "Galaxy S", "SHW-M110S": "Galaxy S", "SHW-M190S": "Galaxy S", "SPH-D700": "Galaxy S Epic", "GT-I9070": "Galaxy S Advance", "GT-I9070P": "Galaxy S Advance", "SCH-R930": "Galaxy S Aviator", "SGH-T769": "Galaxy S Blaze", "SGH-T699": "Galaxy S BlazeQ", "SAMSUNG-SGH-I896": "Galaxy S Captivate", "SGH-I896": "Galaxy S Captivate", "SCH-I400": "Galaxy S Continuum", "GT-S7562": "Galaxy S Duos", "GT-S7562L": "Galaxy S DUOS", "GT-S7568": "Galaxy S Duos", "GT-S7582": "Galaxy S Duos2", "GT-S7582L": "Galaxy S Duos2", "SM-G313HZ": "Galaxy S Duos3", "SGH-T959P": "Galaxy S Fascinate", "SAMSUNG-SGH-I927R": "Galaxy S Glide", "SCH-R940": "Galaxy S Lightray", "GT-I9001": "Galaxy S Plus", "SCH-I405": "Galaxy S Stratosphere", "SGH-T959": "Galaxy S Vibrant", "SGH-T959D": "Galaxy S Vibrant", "GT-S7566": "Galaxy S duos", "SM-G8750": "Galaxy S 轻奢版", "GT-I9100": "Galaxy S2", "GT-I9100M": "Galaxy S2", "GT-I9100P": "Galaxy S2", "GT-I9100T": "Galaxy S2", "GT-I9103": "Galaxy S2", "GT-I9108": "Galaxy S2", "GT-I9210T": "Galaxy S2", "SC-02C": "Galaxy S2", "SCH-R760X": "Galaxy S2", "SAMSUNG-SGH-I777": "Galaxy S2", "SGH-S959G": "Galaxy S2", "SGH-T989": "Galaxy S2", "SHV-E110S": "Galaxy S2", "SHW-M250K": "Galaxy S2", "SHW-M250L": "Galaxy S2", "SHW-M250S": "Galaxy S2", "SCH-i929": "Galaxy S2 Duos", "SCH-R760": "Galaxy S2 Epic", "SPH-D710": "Galaxy S2 Epic", "SPH-D710BST": "Galaxy S2 Epic", "SPH-D710VMUB": "Galaxy S2 Epic", "SGH-I757M": "Galaxy S2 HD LTE", "SHV-E120K": "Galaxy S2 HD LTE", "SHV-E120L": "Galaxy S2 HD LTE", "SHV-E120S": "Galaxy S2 HD LTE", "GT-I9210": "Galaxy S2 LTE", "SC-03D": "Galaxy S2 LTE", "SGH-I727R": "Galaxy S2 LTE", "GT-I9100G": "Galaxy S2 Plus", "GT-I9105": "Galaxy S2 Plus", "GT-I9105P": "Galaxy S2 Plus", "SAMSUNG-SGH-I727": "Galaxy S2 Skyrocket", "SGH-I727": "Galaxy S2 Skyrocket", "ISW11SC": "Galaxy S2 Wimax", "SGH-T989D": "Galaxy S2 X", "SC-03E": "Galaxy S3", "SGH-I748": "Galaxy S3", "SHV-E210K": "Galaxy S3", "SHV-E210L": "Galaxy S3", "SHV-E210S": "Galaxy S3", "SAMSUNG-SGH-I747": "Galaxy S3", "SGH-I747M": "Galaxy S3", "SGH-T999V": "Galaxy S3", "SCH-R530C": "Galaxy S3", "Gravity": "Galaxy S3", "SC-06D": "Galaxy S3", "SGH-T999N": "Galaxy S3", "SPH-L710T": "Galaxy S3", "SGH-T999L": "Galaxy S3", "SCH-R530M": "Galaxy S3", "SCH-L710": "Galaxy S3", "SPH-L710": "Galaxy S3", "SCH-S960L": "Galaxy S3", "SCH-S968C": "Galaxy S3", "SGH-T999": "Galaxy S3", "SCH-R530U": "Galaxy S3", "SCH-I535": "Galaxy S3", "SCH-I535PP": "Galaxy S3", "SCH-R530X": "Galaxy S3", "GT-I9300": "Galaxy S3", "GT-I9300T": "Galaxy S3", "SCH-I939": "Galaxy S3", "GT-I9308": "Galaxy S3", "SCH-I939D": "Galaxy S3", "SHW-M440S": "Galaxy S3", "GT-I9305": "Galaxy S3", "GT-I9305N": "Galaxy S3", "GT-I9305T": "Galaxy S3", "GravityQuad": "Galaxy S3", "GT-I8262B": "Galaxy S3 Duos", "GT-I8190": "Galaxy S3 Mini", "GT-I8190L": "Galaxy S3 Mini", "GT-I8190N": "Galaxy S3 Mini", "GT-I8190T": "Galaxy S3 Mini", "SAMSUNG-SM-G730A": "Galaxy S3 Mini", "SM-G730W8": "Galaxy S3 Mini", "SM-G730V": "Galaxy S3 Mini", "GT-I8200L": "Galaxy S3 Mini", "GT-I8200N": "Galaxy S3 Mini Value Edition", "GT-I8200": "Galaxy S3 Mini Value Edition", "GT-I8200Q": "Galaxy S3 Mini Value Edition", "GT-I9300I": "Galaxy S3 Neo Plus", "GT-I9301I": "Galaxy S3 Neo", "GT-I9301Q": "Galaxy S3 Neo", "GT-I9308I": "Galaxy S3 Neo Plus", "SCL21": "Galaxy S3 Progre", "SM-G3812B": "Galaxy S3 Slim", "SC-04E": "Galaxy S4", "GT-I9500": "Galaxy S4", "SCH-I959": "Galaxy S4", "SHV-E300K": "Galaxy S4", "SHV-E300L": "Galaxy S4", "SHV-E300S": "Galaxy S4", "GT-I9505": "Galaxy S4", "GT-I9508": "Galaxy S4", "GT-I9508C": "Galaxy S4", "SGH-M919N": "Galaxy S4", "SAMSUNG-SGH-I337Z": "Galaxy S4", "SAMSUNG-SGH-I337": "Galaxy S4", "SGH-I337M": "Galaxy S4", "SGH-M919V": "Galaxy S4", "SCH-R970C": "Galaxy S4", "SCH-R970X": "Galaxy S4", "SCH-I545L": "Galaxy S4", "SPH-L720T": "Galaxy S4", "SPH-L720": "Galaxy S4", "SM-S975L": "Galaxy S4", "SGH-S970G": "Galaxy S4", "SGH-M919": "Galaxy S4", "SCH-R970": "Galaxy S4", "SCH-I545": "Galaxy S4", "SCH-I545PP": "Galaxy S4", "GT-I9507": "Galaxy S4", "GT-I9507V": "Galaxy S4", "GT-I9515": "Galaxy S4", "GT-I9515L": "Galaxy S4", "GT-I9505X": "Galaxy S4", "GT-I9508V": "Galaxy S4", "GT-I9506": "Galaxy S4", "SHV-E330K": "Galaxy S4", "SHV-E330L": "Galaxy S4", "GT-I9295": "Galaxy S4 Active", "SAMSUNG-SGH-I537": "Galaxy S4 Active", "SGH-I537": "Galaxy S4 Active", "SHV-E470S": "Galaxy S4 Active", "GT-I9502": "Galaxy S4 Duos", "SHV-E330S": "Galaxy S4 LTE-A", "GT-I9190": "Galaxy S4 Mini", "GT-I9192": "Galaxy S4 Mini", "GT-I9195": "Galaxy S4 Mini", "GT-I9195L": "Galaxy S4 Mini", "GT-I9195T": "Galaxy S4 Mini", "GT-I9195X": "Galaxy S4 Mini", "GT-I9197": "Galaxy S4 Mini", "SGH-I257M": "Galaxy S4 Mini", "SHV-E370K": "Galaxy S4 Mini", "SHV-E370D": "Galaxy S4 Mini", "SCH-I435L": "Galaxy S4 Mini", "SPH-L520": "Galaxy S4 Mini", "SCH-R890": "Galaxy S4 Mini", "SCH-I435": "Galaxy S4 Mini", "GT-I9192I": "Galaxy S4 Mini", "GT-I9195I": "Galaxy S4 Mini", "SAMSUNG-SGH-I257": "Galaxy S4 Mini", "SM-C101": "Galaxy S4 Zoom", "SAMSUNG-SM-C105A": "Galaxy S4 Zoom", "SM-C105K": "Galaxy S4 Zoom", "SM-C105L": "Galaxy S4 Zoom", "SM-C105S": "Galaxy S4 Zoom", "SM-C105": "Galaxy S4 Zoom", "SC-04F": "Galaxy S5", "SCL23": "Galaxy S5", "SM-G900H": "Galaxy S5", "SM-G9008W": "Galaxy S5", "SM-G9009W": "Galaxy S5", "SM-G900F": "Galaxy S5", "SM-G900FQ": "Galaxy S5", "SM-G900I": "Galaxy S5", "SM-G900M": "Galaxy S5", "SM-G900MD": "Galaxy S5", "SM-G900T1": "Galaxy S5", "SM-G900T4": "Galaxy S5", "SM-G900R7": "Galaxy S5", "SAMSUNG-SM-G900AZ": "Galaxy S5", "SAMSUNG-SM-G900A": "Galaxy S5", "SM-G900W8": "Galaxy S5", "SM-G9006W": "Galaxy S5", "SM-G900K": "Galaxy S5", "SM-G900L": "Galaxy S5", "SM-G900R6": "Galaxy S5", "SM-G900S": "Galaxy S5", "SM-G900P": "Galaxy S5", "SM-S903VL": "Galaxy S5", "SM-G900T": "Galaxy S5", "SM-G900T3": "Galaxy S5", "SM-G900R4": "Galaxy S5", "SM-G900V": "Galaxy S5", "SM-G900X": "Galaxy S5", "SM-G906K": "Galaxy S5", "SM-G906L": "Galaxy S5", "SM-G906S": "Galaxy S5", "SC-02G": "Galaxy S5 Active", "SM-G870F0": "Galaxy S5 Active", "SM-G870F": "Galaxy S5 Active", "SAMSUNG-SM-G870A": "Galaxy S5 Active", "SM-G870W": "Galaxy S5 Active", "SM-G900FD": "Galaxy S5 Dual SIM", "SM-G900FG": "Galaxy S5 Google Play Edition", "SM-G860P": "Galaxy S5 K Sport", "SM-G901F": "Galaxy S5 LTE-A", "SM-G800H": "Galaxy S5 Mini", "SM-G800R4": "Galaxy S5 Mini", "SM-G903F": "Galaxy S5 Neo", "SM-G903M": "Galaxy S5 Neo", "SM-G903W": "Galaxy S5 Neo", "SM-G800HQ": "Galaxy S5 mini", "SM-G800F": "Galaxy S5 mini", "SM-G800M": "Galaxy S5 mini", "SM-G800Y": "Galaxy S5 mini", "SAMSUNG-SM-G800A": "Galaxy S5 mini", "SM-G800X": "Galaxy S5 mini", "SC-05G": "Galaxy S6", "SM-G920F": "Galaxy S6", "SM-G920I": "Galaxy S6", "SM-G920X": "Galaxy S6", "SM-G920R7": "Galaxy S6", "SAMSUNG-SM-G920AZ": "Galaxy S6", "SAMSUNG-SM-G920A": "Galaxy S6", "SM-G920W8": "Galaxy S6", "SM-G9200": "Galaxy S6", "SM-G9208": "Galaxy S6", "SM-G9209": "Galaxy S6", "SM-G920K": "Galaxy S6", "SM-G920L": "Galaxy S6", "SM-G920R6": "Galaxy S6", "SM-G920T1": "Galaxy S6", "SM-G920S": "Galaxy S6", "SM-G920P": "Galaxy S6", "SM-S906L": "Galaxy S6", "SM-S907VL": "Galaxy S6", "SM-G920T": "Galaxy S6", "SM-G920R4": "Galaxy S6", "SM-G920V": "Galaxy S6", "SAMSUNG-SM-G890A": "Galaxy S6 Active", "404SC": "Galaxy S6 Edge", "SC-04G": "Galaxy S6 Edge", "SCV31": "Galaxy S6 Edge", "SM-G925I": "Galaxy S6 Edge", "SM-G925X": "Galaxy S6 Edge", "SM-G925R7": "Galaxy S6 Edge", "SAMSUNG-SM-G925A": "Galaxy S6 Edge", "SM-G925W8": "Galaxy S6 Edge", "SM-G9250": "Galaxy S6 Edge", "SM-G925K": "Galaxy S6 Edge", "SM-G925R6": "Galaxy S6 Edge", "SM-G925S": "Galaxy S6 Edge", "SM-G925P": "Galaxy S6 Edge", "SM-G925T": "Galaxy S6 Edge", "SM-G925R4": "Galaxy S6 Edge", "SM-G925V": "Galaxy S6 Edge", "SM-G9287C": "Galaxy S6 Edge+", "SM-G928C": "Galaxy S6 Edge+", "SM-G928G": "Galaxy S6 edge+", "SM-G928I": "Galaxy S6 Edge+", "SM-G928X": "Galaxy S6 Edge+", "SAMSUNG-SM-G928A": "Galaxy S6 Edge+", "SM-G928W8": "Galaxy S6 Edge+", "SM-G9280": "Galaxy S6 Edge+", "SM-G928K": "Galaxy S6 Edge+", "SM-G928N0": "Galaxy S6 Edge+", "SM-G928L": "Galaxy S6 Edge+", "SM-G928S": "Galaxy S6 Edge+", "SM-G928P": "Galaxy S6 Edge+", "SM-G928T": "Galaxy S6 Edge+", "SM-G928R4": "Galaxy S6 Edge+", "SM-G928V": "Galaxy S6 Edge+", "SM-G925F": "Galaxy S6 edge", "SM-G925L": "Galaxy S6 edge", "SM-G9287": "Galaxy S6 edge+", "SM-G928F": "Galaxy S6 edge+", "SM-G930F": "Galaxy S7", "SM-G930X": "Galaxy S7", "SM-G930W8": "Galaxy S7", "SM-G930K": "Galaxy S7", "SM-G930L": "Galaxy S7", "SM-G930S": "Galaxy S7", "SM-G930R7": "Galaxy S7", "SAMSUNG-SM-G930AZ": "Galaxy S7", "SAMSUNG-SM-G930A": "Galaxy S7", "SM-G930VC": "Galaxy S7", "SM-G9300": "Galaxy S7", "SM-G9308": "Galaxy S7", "SM-G930R6": "Galaxy S7", "SM-G930T1": "Galaxy S7", "SM-G930P": "Galaxy S7", "SM-G930VL": "Galaxy S7", "SM-G930T": "Galaxy S7", "SM-G930U": "Galaxy S7", "SM-G930R4": "Galaxy S7", "SM-G930V": "Galaxy S7", "SAMSUNG-SM-G891A": "Galaxy S7 Active", "SC-02H": "Galaxy S7 Edge", "SCV33": "Galaxy S7 Edge", "SM-G935X": "Galaxy S7 Edge", "SM-G935W8": "Galaxy S7 Edge", "SM-G935K": "Galaxy S7 Edge", "SM-G935S": "Galaxy S7 Edge", "SAMSUNG-SM-G935A": "Galaxy S7 Edge", "SM-G935VC": "Galaxy S7 Edge", "SM-G935P": "Galaxy S7 Edge", "SM-G935T": "Galaxy S7 Edge", "SM-G935R4": "Galaxy S7 Edge", "SM-G935V": "Galaxy S7 Edge", "SM-G935F": "Galaxy S7 edge", "SM-G935L": "Galaxy S7 edge", "SM-G9350": "Galaxy S7 edge", "SM-G935U": "Galaxy S7 edge", "SC-02J": "Galaxy S8", "SCV36": "Galaxy S8", "SM-G950F": "Galaxy S8", "SM-G950N": "Galaxy S8", "SM-G950W": "Galaxy S8", "SM-G9500": "Galaxy S8", "SM-G9508": "Galaxy S8", "SM-G950U": "Galaxy S8", "SM-G950U1": "Galaxy S8", "SM-G892A": "Galaxy S8 Active", "SM-G892U": "Galaxy S8 Active", "SC-03J": "Galaxy S8+", "SCV35": "Galaxy S8+", "SM-G955F": "Galaxy S8+", "SM-G955N": "Galaxy S8+", "SM-G955W": "Galaxy S8+", "SM-G9550": "Galaxy S8+", "SM-G955U": "Galaxy S8+", "SM-G955U1": "Galaxy S8+", "SC-02K": "Galaxy S9", "SCV38": "Galaxy S9", "SM-G960F": "Galaxy S9", "SM-G960N": "Galaxy S9", "SM-G9600": "Galaxy S9", "SM-G9608": "Galaxy S9", "SM-G960W": "Galaxy S9", "SM-G960U": "Galaxy S9", "SM-G960U1": "Galaxy S9", "SC-03K": "Galaxy S9+", "SCV39": "Galaxy S9+", "SM-G965F": "Galaxy S9+", "SM-G965N": "Galaxy S9+", "SM-G9650": "Galaxy S9+", "SM-G965W": "Galaxy S9+", "SM-G965U": "Galaxy S9+", "SM-G965U1": "Galaxy S9+", "GT-I5700": "Galaxy Spica", "GT-I5700L": "Galaxy Spica", "GT-I5700R": "Galaxy Spica", "GT-i5700": "Galaxy Spica", "GT-S5282": "Galaxy Star", "GT-S5280": "Galaxy Star", "GT-S7262": "Galaxy Star Plus", "GT-S5283B": "Galaxy Star Trios", "SM-G350E": "Galaxy Star2 Plus", "SCH-I200": "Galaxy Stellar", "SCH-I200PP": "Galaxy Stellar", "SCH-I415": "Galaxy Stratosphere2", "SCH-I829": "Galaxy Style Duos", "SM-T397U": "Galaxy Tab Active2", "SM-T116IR": "Galaxy Tab 3 Lite", "GT-P1000": "Galaxy Tab", "GT-P1000L": "Galaxy Tab", "GT-P1000M": "Galaxy Tab", "GT-P1000N": "Galaxy Tab", "GT-P1000R": "Galaxy Tab", "GT-P1000T": "Galaxy Tab", "GT-P1010": "Galaxy Tab", "GT-P1013": "Galaxy Tab", "SC-01C": "Galaxy Tab", "SCH-I800": "Galaxy Tab", "SGH-T849": "Galaxy Tab", "SHW-M180K": "Galaxy Tab", "SHW-M180L": "Galaxy Tab", "SHW-M180S": "Galaxy Tab", "SHW-M180W": "Galaxy Tab", "SMT-i9100": "Galaxy Tab", "GT-P7500": "Galaxy Tab 10.1", "GT-P7500D": "Galaxy Tab 10.1", "GT-P7503": "Galaxy Tab 10.1", "GT-P7510": "Galaxy Tab 10.1", "SC-01D": "Galaxy Tab 10.1", "SCH-I905": "Galaxy Tab 10.1", "SGH-T859": "Galaxy Tab 10.1", "SHW-M300W": "Galaxy Tab 10.1", "SHW-M380K": "Galaxy Tab 10.1", "SHW-M380S": "Galaxy Tab 10.1", "SHW-M380W": "Galaxy Tab 10.1", "GT-P7501": "Galaxy Tab 10.1 N", "GT-P7511": "Galaxy Tab 10.1 N", "GT-P7100": "Galaxy Tab 10.1 v", "SM-T116NY": "Galaxy Tab 3V 7.0", "SM-T330X": "Galaxy Tab 4 8.0", "SM-T330": "Galaxy Tab4 8.0", "SM-T365": "Galaxy Tab4 Active", "SM-T365Y": "Galaxy Tab 4 Active", "SPH-P100": "Galaxy Tab 7.0", "GT-P6200": "Galaxy Tab 7.0 Plus", "GT-P6200L": "Galaxy Tab 7.0 Plus", "GT-P6201": "Galaxy Tab 7.0 Plus", "GT-P6210": "Galaxy Tab 7.0 Plus", "GT-P6211": "Galaxy Tab 7.0 Plus", "SC-02D": "Galaxy Tab 7.0 Plus", "SGH-T869": "Galaxy Tab 7.0 Plus", "SHW-M430W": "Galaxy Tab 7.0 Plus", "GT-P6800": "Galaxy Tab 7.7", "GT-P6810": "Galaxy Tab 7.7", "SCH-I815": "Galaxy Tab 7.7", "SC-01E": "Galaxy Tab 7.7 Plus", "GT-P7300": "Galaxy Tab 8.9", "GT-P7310": "Galaxy Tab 8.9", "GT-P7320": "Galaxy Tab 8.9", "SCH-P739": "Galaxy Tab 8.9", "SAMSUNG-SGH-I957": "Galaxy Tab 8.9", "SAMSUNG-SGH-I957D": "Galaxy Tab 8.9", "SGH-I957D": "Galaxy Tab 8.9", "SAMSUNG-SGH-I957M": "Galaxy Tab 8.9", "SGH-I957M": "Galaxy Tab 8.9", "SAMSUNG-SGH-I957R": "Galaxy Tab 8.9", "SGH-I957R": "Galaxy Tab 8.9", "SHV-E140K": "Galaxy Tab 8.9", "SHV-E140L": "Galaxy Tab 8.9", "SHV-E140S": "Galaxy Tab 8.9", "SHW-M305W": "Galaxy Tab 8.9", "SM-T555": "Galaxy Tab A", "SM-T550": "Galaxy Tab A 9.7", "SM-P555M": "Galaxy Tab A", "SM-P550": "Galaxy Tab A 9.7", "SM-P355M": "Galaxy Tab A", "SM-P355C": "Galaxy Tab A", "SM-T585": "Galaxy Tab A (2016)", "SM-T585C": "Galaxy Tab A (2016)", "SM-T580": "Galaxy Tab A (2016)", "SM-P580": "Galaxy Tab A 10.1", "SM-T385": "Galaxy Tab A (2017)", "SM-T385M": "Galaxy Tab A (2017)", "SM-T385C": "Galaxy Tab A (2017)", "SM-T385K": "Galaxy Tab A (2017)", "SM-T385L": "Galaxy Tab A (2017)", "SM-T385S": "Galaxy Tab A (2017)", "SM-T380": "Galaxy Tab A (2017)", "SM-T595": "Galaxy Tab A 10.5(2018)", "SM-T590": "Galaxy Tab A (2018, 10.5)", "SM-T583": "Galaxy Tab A 10.1", "SM-T585M": "Galaxy Tab A 10.1", "SM-T587": "Galaxy Tab A 10.1", "SM-T585N0": "Galaxy Tab A 10.1", "SM-T580X": "Galaxy Tab A 10.1", "SM-P585": "Galaxy Tab A 10.1(2016)", "SM-P585Y": "Galaxy Tab A 10.1(2016)", "SM-T285": "Galaxy Tab A 7.0", "SM-T285M": "Galaxy Tab A 7.0", "SM-T287": "Galaxy Tab A 7.0", "SM-T285YD": "Galaxy Tab A 7.0", "SM-T280": "Galaxy Tab A 7.0", "SM-T355": "Galaxy Tab A 8.0", "SM-T355Y": "Galaxy Tab A 8.0", "SM-T355C": "Galaxy Tab A 8.0", "SM-T357T": "Galaxy Tab A 8.0", "SM-T350": "Galaxy Tab A 8.0", "SM-T350X": "Galaxy Tab A 8.0", "SM-P355": "Galaxy Tab A 8.0", "SM-P355Y": "Galaxy Tab A 8.0", "SM-P350": "Galaxy Tab A 8.0", "SM-T555C": "Galaxy Tab A 9.7", "SM-T550X": "Galaxy Tab A 9.7", "SM-P555": "Galaxy Tab A 9.7", "SM-P555C": "Galaxy Tab A 9.7", "SM-P555Y": "Galaxy Tab A 9.7", "SM-P555K": "Galaxy Tab A 9.7", "SM-P555L": "Galaxy Tab A 9.7", "SM-P555S": "Galaxy Tab A 9.7", "SM-T357W": "Galaxy Tab A S 8.0", "SM-T380C": "Galaxy Tab A2 8.0", "SM-T395": "Galaxy Tab Active2", "SM-T395C": "Galaxy Tab Active2", "SM-T395N": "Galaxy Tab Active2", "SM-T390": "Galaxy Tab Active2", "SAMSUNG-SM-T377A": "Galaxy Tab E 8.0", "SM-T377W": "Galaxy Tab E 8.0", "SM-T375L": "Galaxy Tab E 8.0", "SM-T375S": "Galaxy Tab E 8.0", "SM-T377T": "Galaxy Tab E 8.0", "SM-T3777": "Galaxy Tab E 8.0", "SM-T377V": "Galaxy Tab E 8.0", "SM-T377P": "Galaxy Tab E 8.0", "SM-T377R4": "Galaxy Tab E 8.0", "SM-T561": "Galaxy Tab E 9.6", "SM-T561M": "Galaxy Tab E 9.6", "SM-T561Y": "Galaxy Tab E 9.6", "SM-T562": "Galaxy Tab E 9.6", "SM-T567V": "Galaxy Tab E 9.6", "SM-T560": "Galaxy Tab E 9.6", "SM-T560NU": "Galaxy Tab E 9.6", "SM-T378V": "Galaxy Tab E8.0", "SM-T116BU": "Galaxy Tab Plus 7.0", "SM-T525": "Galaxy Tap Pro 10.1", "SM-T520": "Galaxy Tab Pro 10.1", "SM-T520CC": "Galaxy Tab Pro 10.1 Chef Collection", "SM-T905": "Galaxy Tab Pro 12.2", "SM-T900": "Galaxy Tab Pro 12.2", "SM-T900X": "Galaxy Tab Pro 12.2", "SM-T325": "Galaxy Tab Pro 8.4", "SM-T320": "Galaxy Tap Pro 8.4", "SM-T320X": "Galaxy Tab Pro 8.4", "SM-T320NU": "Galaxy Tab Pro 8.4", "SM-T2519": "Galaxy Tab Q", "SM-T800": "Galaxy TabS 10.5", "SC-03G": "Galaxy Tab S 8.4", "SM-T705": "Galaxy TabS 8.4", "SM-T705C": "Galaxy Tab S 8.4", "SM-T705Y": "Galaxy Tab S 8.4", "SM-T707V": "Galaxy Tab S 8.4", "SM-T700": "Galaxy TabS 8.4", "SM-T815": "Galaxy Tab S2", "SM-T819": "Galaxy Tab S2", "SM-T819C": "Galaxy Tab S2 9.7", "SM-T813": "Galaxy Tab S2 9.7", "SM-T810": "Galaxy Tab S2 9.7", "SM-T715": "Galaxy Tab S2", "SM-T719": "Galaxy Tab S2", "SM-T719Y": "Galaxy Tab S2", "SM-T719C": "Galaxy Tab S2", "SM-T713": "Galaxy Tab S2 8.0", "SM-T710": "Galaxy Tab S2 8.0", "SM-T715Y": "Galaxy Tab S2 8.0", "SM-T715C": "Galaxy Tab S2 8.0", "SM-T715N0": "Galaxy Tab S2 8.0", "SM-T710X": "Galaxy Tab S2 8.0", "SM-T815C": "Galaxy Tab S2 9.7", "SM-T815Y": "Galaxy Tab S2 9.7", "SM-T817": "Galaxy Tab S2 9.7", "SAMSUNG-SM-T817A": "Galaxy Tab S2 9.7", "SM-T817W": "Galaxy Tab S2 9.7", "SM-T815N0": "Galaxy Tab S2 9.7", "SM-T817P": "Galaxy Tab S2 9.7", "SM-T817T": "Galaxy Tab S2 9.7", "SM-T817R4": "Galaxy Tab S2 9.7", "SM-T817V": "Galaxy Tab S2 9.7", "SM-T818": "Galaxy Tab S2 9.7", "SM-T819Y": "Galaxy Tab S2 9.7", "SAMSUNG-SM-T818A": "Galaxy Tab S2 9.7", "SM-T818W": "Galaxy Tab S2 9.7", "SM-T818T": "Galaxy Tab S2 9.7", "SM-T810X": "Galaxy Tab S2 9.7", "SM-T825": "Galaxy TabS3", "SM-T825C": "Galaxy TabS3", "SM-T825X": "Galaxy Tab S3", "SM-T827": "Galaxy Tab S3", "SM-T825N0": "Galaxy Tab S3", "SM-T827R4": "Galaxy Tab S3", "SM-T827V": "Galaxy Tab S3", "SM-T820": "Galaxy Tab S3", "SM-T820X": "Galaxy Tab S3", "SM-T835": "Galaxy Tab S4", "SM-T837V": "Galaxy Tab S4", "SM-T830": "Galaxy Tab S4", "SAMSUNG-SGH-I497": "Galaxy Tab2 10.1", "SGH-I497": "Galaxy Tab2 10.1", "GT-P5100": "Galaxy Tab2 10.1", "SPH-P500": "Galaxy Tab2 10.1", "SGH-T779": "Galaxy Tab2 10.1", "SCH-I915": "Galaxy Tab2 10.1", "GT-P5110": "Galaxy Tab2 10.1", "GT-P5113": "Galaxy Tab2 10.1", "GT-P3100": "Galaxy Tab2 7.0", "GT-P3100B": "Galaxy Tab2 7.0", "GT-P3105": "Galaxy Tab2 7.0", "SCH-I705": "Galaxy Tab2 7.0", "SCH-i705": "Galaxy Tab2 7.0", "GT-P3110": "Galaxy Tab2 7.0", "GT-P3113": "Galaxy Tab2 7.0", "SM-T310": "Galaxy Tab3 8.0", "GT-P5200": "Galaxy Tab3 10.1", "GT-P5220": "Galaxy Tab3 10.1", "GT-P5210": "Galaxy Tab3 10.1", "GT-P5210XD1": "Galaxy Tab3 10.1", "SM-T211": "Galaxy Tab3 7.0", "SM-T212": "Galaxy Tab3 7.0", "SM-T211M": "Galaxy Tab3 7.0", "SM-T215": "Galaxy Tab3 7.0", "SAMSUNG-SM-T217A": "Galaxy Tab3 7.0", "SM-T217S": "Galaxy Tab3 7.0", "SM-T217T": "Galaxy Tab3 7.0", "SM-T210": "Galaxy Tab3 7.0", "SM-T210R": "Galaxy Tab3 7.0", "SM-T210L": "Galaxy Tab3 7.0", "SM-T311": "Galaxy Tab3 8.0", "SM-T312": "Galaxy Tab3 8.0", "SM-T315": "Galaxy Tab3 8.0", "SM-T315T": "Galaxy Tab3 8.0", "SM-T310X": "Galaxy Tab3 8.0", "SM-T210X": "Galaxy Tab3 8.0", "SM-T2105": "Galaxy Tab3 Kids", "SM-T111": "Galaxy Tab3 Lite", "SM-T111M": "Galaxy Tab3 Lite", "SM-T110": "Galaxy Tab3 Lite", "SM-T116NQ": "Galaxy Tab3 Lite 7.0", "SM-T113": "Galaxy Tab3 Lite 7.0", "SM-T116": "Galaxy Tab3 VE 7.0", "SM-T116NU": "Galaxy Tab3V 7.0", "SM-T113NU": "Galaxy Tab3V 7.0", "SM-T530NN": "Galaxy Tab4", "SM-T531": "Galaxy Tab4 10.0", "SM-T535": "Galaxy Tab4 10.0", "SAMSUNG-SM-T537A": "Galaxy Tab4 10.0", "SM-T537R4": "Galaxy Tab4 10.0", "SM-T537V": "Galaxy Tab4 10.0", "SM-T536": "Galaxy Tab4 10.1", "SM-T533": "Galaxy Tab4 10.1", "SM-T530": "Galaxy Tab4 10.1", "SM-T530X": "Galaxy Tab4 10.1", "SM-T530NU": "Galaxy Tab4 Nook 10.1", "SM-T230NZ": "Galaxy Tab4 7", "403SC": "Galaxy Tab4 7.0", "SM-T230NW": "Galaxy Tab4 7.0", "SM-T231": "Galaxy Tab4 7.0", "SM-T232": "Galaxy Tab4 7.0", "SM-T235": "Galaxy Tab4 7.0", "SM-T235Y": "Galaxy Tab4 7.0", "SM-T237P": "Galaxy Tab4 7.0", "SM-T237V": "Galaxy Tab4 7.0", "SM-T239": "Galaxy Tab4 7.0", "SM-T2397": "Galaxy Tab4 7.0", "SM-T239M": "Galaxy Tab4 7.0", "SM-T239C": "Galaxy Tab4 7.0", "SM-T230": "Galaxy Tab4 7.0", "SM-T230NY": "Galaxy Tab4 7.0", "SM-T230X": "Galaxy Tab4 7.0", "SM-T230NT": "Galaxy Tab4 7.0", "SM-T230NU": "Galaxy Tab4 7.0", "SM-T331": "Galaxy Tab4 8.0", "SM-T335": "Galaxy Tab4 8.0", "SAMSUNG-SM-T337A": "Galaxy Tab4 8.0", "SM-T335K": "Galaxy Tab4 8.0", "SM-T335L": "Galaxy Tab4 8.0", "SM-T337T": "Galaxy Tab4 8.0", "SM-T337V": "Galaxy Tab4 8.0", "SM-T330NU": "Galaxy Tab4 8.0", "SM-T365M": "Galaxy Tab4 Active", "SM-T365F0": "Galaxy Tab4 Active", "SM-T360": "Galaxy Tab4 Active", "SM-P585M": "Galaxy TabA Plus 10.1", "SM-P587": "Galaxy TabA Plus 10.1", "SM-P588C": "Galaxy TabA Plus 10.1", "SM-P585N0": "Galaxy TabA Plus 10.1", "SM-P583": "Galaxy TabA Plus 10.1", "SM-T587P": "Galaxy TabA Plus 10.1", "SM-P580X": "Galaxy TabA Plus10.1", "SM-T378K": "Galaxy TabE 8.0", "SM-T378L": "Galaxy TabE 8.0", "SM-T378S": "Galaxy TabE 8.0", "SCT21": "Galaxy TabS 10.5", "SM-T805K": "Galaxy TabS 10.5", "SM-T805L": "Galaxy TabS 10.5", "SM-T805S": "Galaxy TabS 10.5", "SM-T805": "Galaxy TabS 10.5", "SM-T805M": "Galaxy TabS 10.5", "SM-T805Y": "Galaxy TabS 10.5", "SM-T807": "Galaxy TabS 10.5", "SAMSUNG-SM-T807A": "Galaxy TabS 10.5", "SM-T805W": "Galaxy TabS 10.5", "SM-T807P": "Galaxy TabS 10.5", "SM-T807T": "Galaxy TabS 10.5", "SM-T807R4": "Galaxy TabS 10.5", "SM-T807V": "Galaxy TabS 10.5", "SM-T800X": "Galaxy TabS 10.5", "SM-T705M": "Galaxy TabS 8.4", "SAMSUNG-SM-T707A": "Galaxy TabS 8.4", "SM-T705W": "Galaxy TabS 8.4", "SM-T818V": "Galaxy TabS2 9.7", "SM-T825Y": "Galaxy TabS3", "GT-S7392": "Galaxy Trend Duos", "GT-S7392L": "Galaxy Trend", "GT-S7568I": "Galaxy Trend", "GT-S7562i": "Galaxy Trend Duos", "GT-S7572": "Galaxy Trend Duos", "GT-S7562C": "Galaxy Trend Duos", "GT-S7390L": "Galaxy Trend Lite", "GT-S7580": "Galaxy Trend Plus", "GT-S7580E": "Galaxy Trend Plus", "GT-S7580L": "Galaxy Trend Plus", "GT-S7583T": "Galaxy Trend Plus", "GT-S7898": "Galaxy Trend2", "GT-S7898I": "Galaxy Trend2", "SCH-I739": "Galaxy Trend2", "SM-G3502U": "Galaxy Trend3", "SM-G3508": "Galaxy Trend3", "SM-G3509": "Galaxy Trend3", "SM-G3508I": "Galaxy Trend3", "SM-G3502C": "Galaxy Trend3", "SM-G3502I": "Galaxy Trend3", "SM-G3508J": "Galaxy Trend3", "SM-G3509I": "Galaxy Trend3", "SHW-M130L": "Galaxy U", "SPH-L300": "Galaxy Victory", "SM-T677": "Galaxy View", "SAMSUNG-SM-T677A": "Galaxy View", "SM-T677V": "Galaxy View", "SM-T670": "Galaxy View", "GT-I8150": "Galaxy W", "GT-I8150B": "Galaxy W", "GT-I8150T": "Galaxy W", "SGH-T679M": "Galaxy W", "SM-T255S": "Galaxy W", "SM-G600S": "Galaxy Wide", "SM-J727S": "Galaxy Wide2", "SM-J737S": "Galaxy Wide3", "GT-I8558": "Galaxy Win", "SCH-I869": "Galaxy Win", "GT-I8552": "Galaxy Win Duos", "GT-I8552B": "Galaxy Win", "GT-I8550E": "Galaxy Win", "SHV-E500L": "Galaxy Win", "SHV-E500S": "Galaxy Win", "SM-G3818": "Galaxy Win Pro", "SM-G3819": "Galaxy Win Pro", "SM-G3819D": "Galaxy Win Pro", "SM-G3812": "Galaxy Win Pro", "SM-G360BT": "Galaxy Win2", "GT-S5690": "Galaxy Xcover", "GT-S5690L": "Galaxy Xcover", "GT-S5690M": "Galaxy Xcover", "GT-S5690R": "Galaxy Xcover", "GT-S7710": "Galaxy Xcover2", "GT-S7710L": "Galaxy Xcover2", "SM-G388F": "Galaxy Xcover3", "SM-G389F": "Galaxy Xcover3", "SM-G390F": "Galaxy Xcover4", "SM-G390Y": "Galaxy Xcover4", "SM-G390W": "Galaxy Xcover4", "GT-S5360": "Galaxy Y", "GT-S5360B": "Galaxy Y", "GT-S5360L": "Galaxy Y", "GT-S5360T": "Galaxy Y", "GT-S5363": "Galaxy Y", "GT-S5368": "Galaxy Y", "GT-S5369": "Galaxy Y", "SCH-I509": "Galaxy Y", "SCH-i509": "Galaxy Y", "GT-S6102": "Galaxy Y Duos", "GT-S6102B": "Galaxy Y Duos", "GT-S6102E": "Galaxy Y Duos", "GT-S5303B": "Galaxy Y Plus", "GT-S6108": "Galaxy Y Pop", "GT-B5510": "Galaxy Y Pro", "GT-B5510B": "Galaxy Y Pro", "GT-B5510L": "Galaxy Y Pro", "GT-B5512": "Galaxy Y Pro Duos", "GT-B5512B": "Galaxy Y Pro Duos", "GT-S5367": "Galaxy Y TV", "GT-S6312": "Galaxy Young", "GT-S6313T": "Galaxy Young", "GT-S6310": "Galaxy Young", "GT-S6310B": "Galaxy Young", "GT-S6310L": "Galaxy Young", "GT-S6310T": "Galaxy Young", "GT-S6310N": "Galaxy Young", "SM-G130H": "Galaxy Young2", "SM-G130M": "Galaxy Young2", "SM-G130U": "Galaxy Young2", "SM-G130BT": "Galaxy Young2", "SM-G130E": "Galaxy Young2", "SM-G130HN": "Galaxy Young2", "SM-G130BU": "Galaxy Young2 Pro", "YP-GB70D": "Galaxy player 70 Plus", "SM-T677NK": "Galaxy view", "SM-T677NL": "Galaxy view", "GT-I8550L": "Galaxy win", "SGH-T399N": "Garda", "SGH-T399": "Garda", "SCH-I100": "Gem", "SCH-W789": "Hennessy", "GT-B9150": "Homesync", "YP-GH1": "IceTouch", "SCH-I110": "Illusion", "SAMSUNG-SGH-I997": "Infuse", "SAMSUNG-SGH-I997R": "Infuse", "SM-J106F": "J1 Mini Prime", "SPH-M900": "Moment", "SM-W2014": "Montblanc", "Nexus S 4G": "Nexus S", "samsung-printer-tablet": "ProXpress M4580", "SPH-M580": "Replenish", "SPH-M580BST": "Replenish", "SCH-R680": "Repp", "GT-S6293T": "Roy VE DTV", "SAMSUNG-SGH-I847": "Rugby Smart", "SM-W2018X": "SM-W2018", "SGH-T839": "Sidekick", "SCH-R730": "Transfix", "SPH-M920": "Transform", "SPH-M930": "Transform Ultra", "SPH-M930BST": "Transform Ultra", "SPH-M910": "VinsQ(M910)", "SM-W2016": "W2016", "SM-W2017": "W2017", "SMT-E5015": "olleh", "SM-G9298": "领世旗舰8", "ETAB_M9021G": "ETAB M9021G", "ETAB_S7042G": "ETAB S7042G", "Sansui Fun": "Fun", "Sansui_Switch": "Switch", "ETAB I7043G": "Tab 7\"", "ETAB_I7043G": "Tab 7\"", "ETAB_I7043G_VP3": "Tab 7\"", "CEM1": "55CE6139M1", "31TL04": "Benesse", "40TL04": "Benesse", "41EA04": "Benesse", "HMB2213PW22WA": "SaskTel maxTV Stream", "SM7216": "mini_SM7216", "Seatel T8": "T8", "Seatel V8A": "V8A", "Seatel V8E": "V8E", "SENSEIT_A109": "A109", "SENSEIT L301": "L301", "SENSEIT A247": "SENSEIT_A247", "SENSEIT N151": "Senseit N151", "S6000": "Telcel S6000", "LS50": "Telcel_LS50", "LS55": "Telcel_LS55", "LCD_32SFINF380A": "2T-C32ACSA, 2T-C32ACMA, 2T-C32ACTA, 2T-C32ACZA", "AQUOS-TVJ18": "4T-C**AM1", "LCD_50FOCAG1T": "4T-C50AG1T", "FS8002": "Z2", "SHARP-ADS1": "ADS1", "403SH": "AQUOS CRYSTAL 2", "402SH": "AQUOS CRYSTAL X", "SH-02H": "AQUOS Compact SH-02H", "SH-02J": "AQUOS EVER SH-02J", "SH-04G": "AQUOS EVER SH-04G", "SHF31": "AQUOS K SHF31", "SHF32": "AQUOS K SHF32", "SHF33": "AQUOS K SHF33", "SHV37_u": "AQUOS L SHV37", "SH-L02": "AQUOS L2", "FS8001": "C1", "P1X": "AQUOS P1", "SHT22": "AQUOS PAD  SHT22", "SH-05G": "AQUOS PAD SH-05G", "SH-06F": "AQUOS PAD SH-06F", "SH-08E": "AQUOS PAD SH-08E", "SHT21": "AQUOS PAD SHT21", "SHL22": "AQUOS PHONE  SERIE SHL22", "SHL23": "AQUOS PHONE  SERIE SHL23", "SHL24": "AQUOS PHONE  SERIE mini SHL24", "IS17SH": "AQUOS PHONE CL IS17SH", "SH-02F": "AQUOS PHONE EX SH-02F", "SH-04E": "AQUOS PHONE EX SH-04E", "IS11SH": "AQUOS PHONE IS11SH", "IS12SH": "AQUOS PHONE IS12SH", "IS13SH": "AQUOS PHONE IS13SH", "IS14SH": "AQUOS PHONE IS14SH", "ISW16SH": "AQUOS PHONE SERIE ISW16SH", "SHL21": "AQUOS PHONE SERIE SHL21", "SH-01D": "AQUOS PHONE SH-01D", "SH-06D": "AQUOS PHONE SH-06D", "SH-12C": "AQUOS PHONE SH-12C", "SH90B": "AQUOS PHONE SH90B", "IS15SH": "AQUOS PHONE SL IS15SH", "SBM102SH2": "AQUOS PHONE SoftBank  102SH II", "SBM006SH": "AQUOS PHONE SoftBank 006SH", "SBM102SH": "AQUOS PHONE SoftBank 102SH", "SBM103SH": "AQUOS PHONE SoftBank 103SH", "SBM104SH": "AQUOS PHONE SoftBank 104SH", "SBM007SH": "AQUOS PHONE THE HYBRID SoftBank 007SH", "SBM007SHJ": "AQUOS PHONE THE HYBRID SoftBank 007SH J", "SBM101SH": "AQUOS PHONE THE HYBRID SoftBank 101SH", "SBM009SH": "AQUOS PHONE THE PREMIUM SoftBank 009SH", "WX05SH": "AQUOS PHONE WX05SH", "SBM206SH": "AQUOS PHONE Xx 206SH", "SBM302SH": "AQUOS PHONE Xx 302SH", "SBM106SH": "AQUOS PHONE Xx SoftBank 106SH", "SBM303SH": "AQUOS PHONE Xx mini 303SH", "SH-01F": "AQUOS PHONE ZETA  SH-01F", "SH-02E": "AQUOS PHONE ZETA SH-02E", "SH-06E": "AQUOS PHONE ZETA SH-06E", "SH-09D": "AQUOS PHONE ZETA SH-09D", "WX04SH": "AQUOS PHONE es WX04SH", "SH-13C": "AQUOS PHONE f SH-13C", "SH-01E": "AQUOS PHONE si SH-01E", "SH-07E": "AQUOS PHONE si SH-07E", "SH-02D": "AQUOS PHONE slider SH-02D", "SBM205SH": "AQUOS PHONE ss 205SH", "SH-07D": "AQUOS PHONE st SH-07D", "SH-10D": "AQUOS PHONE sv SH-10D", "605SH": "AQUOS R", "SH-03J": "AQUOS R SH-03J", "SHV39": "AQUOS R SHV39", "701SH": "AQUOS R compact 701SH", "SH-M06": "AQUOS R compact SH-M06", "SHV41": "AQUOS R compact SHV41", "706SH": "AQUOS R2", "SH-03K": "AQUOS R2 SH-03K", "SHV42": "AQUOS R2 SHV42", "SHL25": "AQUOS SERIE SHL25", "SHV32": "AQUOS SERIE SHV32", "SHV34": "AQUOS SERIE SHV34", "SHV31": "AQUOS SERIE mini SHV31", "SHV33": "AQUOS SERIE mini SHV33", "SHV38": "AQUOS SERIE mini SHV38", "SH-M01": "AQUOS SH-M01", "SH-M02": "AQUOS SH-M02", "SH-M02-EVA20": "AQUOS SH-M02-EVA20", "SH-RM02": "AQUOS SH-RM02", "SHV35": "AQUOS U SHV35", "SHV37": "AQUOS U SHV37", "404SH": "AQUOS Xx", "506SH": "AQUOS Xx 3", "304SH": "AQUOS Xx 304SH", "502SH": "AQUOS Xx2", "503SH": "AQUOS Xx2 mini", "603SH": "AQUOS Xx3 mini", "SH-01G": "AQUOS ZETA SH-01G", "SH-01H": "AQUOS ZETA SH-01H", "SH-03G": "AQUOS ZETA SH-03G", "SH-04F": "AQUOS ZETA SH-04F", "SH-04H": "AQUOS ZETA SH-04H", "606SH": "AQUOS ea", "SH-M03": "AQUOS mini SH-M03", "SHV40_u": "AQUOS sense", "SH-01K": "AQUOS sense SH-01K", "SHV40": "AQUOS sense SHV40", "702SH": "AQUOS sense basic", "SH-M05": "AQUOS sense lite (SH-M05)", "SH-M07": "AQUOS sense plus (SH-M07)", "SH-06G": "AQUOS ケータイ SH-06G", "SH-A01": "B10", "SHV36": "BASIO2 SHV36", "DM014SH": "Disney Mobile DM014SH", "DM-01H": "Disney Mobile on docomo DM-01H", "DM-01J": "Disney Mobile on docomo DM-01J", "SH-02G": "Disney Mobile on docomo SH-02G", "SH-05F": "Disney Mobile on docomo SH-05F", "EB-W51GJ": "EB-WX1GJ/EB-W51GJ", "EB-WX1GJ": "EB-WX1GJ/EB-W51GJ", "SBM003SH": "GALAPAGOS SoftBank 003SH", "SBM005SH": "GALAPAGOS SoftBank 005SH", "HCTT1": "HC-16TT1", "LC-Ux30US": "LC-**UH30U", "LC_40FOC466T": "LC-40SF466T, 2T-C45AE1T, 2T-C40AE1T", "LC_45FOC460T": "LC-45SF460T", "LC-xxLE570X": "LC-50LE570X", "LC-xxCAE5H": "LC-S4H/LC-S45H/LC-S50H", "LC-xxBEL6T": "LC-SU666T/LC-SU766T", "AQUOS-4KTVT17": "LC-UA6800T/4T-C**AM1T", "AQUOS-4KTVX17": "LC-UA6800X", "AQUOS-4KTVJ17": "LC-US5/LC-UH5/4T-C**AJ1/4T-C70AU1", "LC-xxBEL8H-B": "LC-xxUA50H,LC-xxUF50H,LC-xxUD50H", "LC-xxBEL8H-C": "LC-xxUD50H", "LC-UE630X": "LC-xxUE630X", "LC-xxBEL9H": "LC-xxUX50H", "LCD_40FOC465A": "LCD-40SF465A", "LCD_40FOC466A": "LCD-40SF466A, LCD-40TX3000A, LCD-40MX3000A, LCD-40DS3000A, LCD-40X508A", "LCD_40FOC468A": "LCD-40SF468A", "LCD_xxSFFOC480A": "LCD-40SF480A", "LCD_40X418FOCH1A": "LCD-40X418H1A, LCD-40X418H2A, LCD-40X418H3A", "LCD_45FOC46A": "LCD-45SF460A", "LCD_xxSFFOC470A": "LCD-45SF470A", "LCD_xxSFFOC475A": "LCD-45SF475A", "LCD_FOC36A": "LCD-45T45A/LCD-45T46A/LCD-45T47A", "LCD_45FOC3000A": "LCD-45TX3000A", "LCD_45X418FOCH1A": "LCD-45X418H1A, LCD-45X418H2A, LCD-45X418H3A", "LCD-45FOC518H1A": "LCD-45X518H1A", "LCD_50FOC4000A": "LCD-50MY4000A/TX4000A/50SU470A", "LCD_xxSUFOC470A": "LCD-60SU470A", "LCD_xxSUFOC471A": "LCD-60SU471A", "LCD_xxSUFOC475A": "LCD-60SU475A", "LCD-60FOC518H1A": "LCD-60X518H1A", "LCD-LX565A-B": "LCD-LX565A", "LCD-S3A-01": "LCD-S3A", "LCD-xxCAE5A-C": "LCD-SU460A/LCD-SU465A", "LCD-xxCAE5A": "LCD-SU560A", "LCD-xxBEL8A-B": "LCD-SU870A", "LCD-xxCAE5A-D": "LCD-TX5000A", "LCD-xxBEL7A-D": "LCD-xxMY8009A", "LCD-xxEOS5A": "LCD-xxSU585A,LCD-xxSU680A", "LCD-xxDEM6A": "LCD-xxSU670A/xxMY6100A/xxSU675A/xxSU775A/xxSU875A", "LCD_xxSUFOC5A": "LCD-xxSU671A", "LCD_xxSUFOC6A": "LCD-xxSU672A", "LCD-xxDEM7A": "LCD-xxSU775A;LCD-xxMY7100A", "LCD-xxDEM8A": "LCD-xxSU875A;LCD-xxSU675A;LCD-xxMY8100A", "LCD-xxDEM9A": "LCD-xxSX970A,LCD-xxMY9100A", "LCD-xxDEMXA": "LCD-xxX818A,LCD-xxMY818A", "SH-03C": "LYNX 3D SH-03C", "SH-10B": "LYNX SH-10B", "EB-L76G-B": "Media Tablet", "SBM107SH": "PANTONE 5 SoftBank 107SH", "SBM200SH": "PANTONE 6 SoftBank 200SH", "PN_B_series": "PN-B501/PN-B401", "PN_M_series": "PN-M501/PN-M401", "SH-04D": "Q-pot.Phone SH-04D", "S3-SH": "S3", "SH-01EVW": "SH-01E Vivienne Westwood", "SH-01FDQ": "SH-01F DRAGON QUEST", "SH-06DNERV": "SH-06D NERV", "SH825Wi": "SH825wi", "FS8026": "SHARP A2 Lite", "IF9009": "SHARP A2 Mini", "SH-Z01": "SHARP AQUOS C10", "SH-D01": "SHARP AQUOS D10", "FS8010": "SHARP AQUOS S2", "FS8008": "SHARP AQUOS S2 Plus", "FS8016": "SHARP AQUOS S2 Plus", "FS8032": "Sharp HH6", "FS8015": "SHARP AQUOS S3", "FS8018": "SHARP AQUOS V1mini", "FS8028": "SHARP R1S", "FS8025": "SHARP TBC", "IF9007": "Sharp Pi", "FS8014": "Sharp R1", "SBM007SHK": "SoftBank 007SH KT", "SBM107SHB": "SoftBank 107SH B", "305SH": "SoftBank 305SH", "SBM203SH": "SoftBank AQUOS PHONE Xx 203SH", "SW001SH": "Star Wars mobile", "X4-SH": "X4", "LCD_xxFFOCZQ48A": "XLED-40Z4808A", "LCD_50SUFOC480A": "XLED-50SU480A", "LCD_xxFOC580A2": "XLED-50SU583A", "LCD_50UFOCZQ48A": "XLED-50Z4808A", "LCD_60SUFOC485A": "XLED-60SU485A", "LCD_xxSUFOC480A": "XLED-65SU480A", "LCD_xxFOC580A1": "XLED-65SU583A", "LCD_xxUFOCZQ48A": "XLED-65Z4808A", "LCD-xxCAE5A-E": "XLED-xxSU580A, XLED-xxZQ580A, XLED-xxMY5200A, XLED-xxTX5200A", "LCD-xxDEM6A-B": "XLED-xxSU680A;XLED-xxMY6200A;XLED-xxTX6200A;XLED-xxZ6808A", "SBM009SHY": "Yahoo! Phone SoftBank 009SH Y", "FS8009": "z3", "LCD-xxBEL7A-C": "lcd_xxbel7a_c", "509SH": "シンプルスマホ３", "704SH": "シンプルスマホ４", "SR01MW": "ロボホン", "SR02MW": "ロボホン", "SRX002": "ロボホン", "Si01BB": "Bic camera", "Plus2": "PLUS2", "Plus2 4G": "PLUS2 4G", "SICO Topaz": "Sico Topaz", "sico pro": "SSR1-5-8M", "X-treme_PQ24": "X-TREME PQ24", "X-treme_PQ28": "X-TREME PQ28", "Siragon SP-5000": "SP-5000", "SOLARIN": "LABS SOLARIN", "Solarin": "LABS SOLARIN", "Elite_4.0S": "ELITE 4.0S", "Elite 45T": "ELITE 45T", "Elite 4T": "ELITE 4T", "Elite_5_0T": "ELITE 5.0T", "Elite 5T": "ELITE 5T", "Elite T57": "ELITE T57", "Elite_A55": "Elite A55", "Platinum 4.0": "PLATINUM 4.0", "Platinum_4_0Plus": "PLATINUM 4.0+", "Platinum_5.0M": "PLATINUM 5.0M", "Platinum_A5": "PLATINUM A5", "Platinum A57": "PLATINUM A57", "Platinum_B5": "PLATINUM B5", "Platinum M4": "PLATINUM M4", "Platinum_M5": "Platinum M5", "SKYVISION": "SKY VISION1", "PRO_SELFIE": "pro selfie", "IC1110": "UHD2", "DMT_1621": "skylife LTE TV", "globe": "South America", "open_fhd": "South Africa", "HPA02": "Skyworth", "Smailo_2GO": "Smailo 2GO", "M512": "SMARTEX_M512", "Andromax A16C3H": "A16C3H", "Andromax A26C4H": "A26C4H", "Smartfren Andromax AD688G": "NEWAD688G", "Smartfren Andromax AD689G": "AD689G", "Smartfren Andromax AD682H": "Andromax AD682H", "Smartfren Andromax NC36B1H": "AndromaxNC36B1H", "Andromax B16C2G": "B16C2G", "Andromax B16C2H": "B16C2H", "Andromax B26D2H": "B26D2H", "Andromax G36C1G": "G36C1G", "Andromax G36C1H": "G36C1H", "Andromax I46D1G": "I46D1G", "Smartfren Andromax NC36B1G": "NC36B1G", "T5524": "Srtphone", "T5511": "tphone", "T5211": "tphone P", "soda E1": "E1", "soda S1": "soda", "Ex-Handy 209": "XP6", "XP6700": "XP6", "Smart-Ex 201": "XP7", "XP7700": "XP7705", "Smart-Ex 01": "XP7700Z1", "XP8800": "XP8812", "BRAVIA 2015": "BRAVIA 4K 2015", "NSZ-GU1": "BRAVIA Smart Stick", "WT19a": "Xperia live", "WT19i": "Live with Walkman", "Internet TV Box": "Internet TV", "NSZ-GS7/GX70": "NSZGS7", "WALKMAN": "NWZ-ZX1", "NW-Z1000Series": "NW-Z1000", "NWZ-Z1000Series": "NWZ-Z1000", "C6806_GPe": "Smartphone Z Ultra Google Play edition", "Sony Tablet P": "Tablet P", "Sony Tablet S": "Tablet S", "D2114": "Xperia E1", "C1905": "Xperia M", "SO-04E": "Xperia A", "SO-04F": "Xperia A2", "SO-04G": "Xperia A4", "C2304": "Xperia C", "C2305": "Xperia C", "D2533": "Xperia C3", "D2502": "Xperia C3 Dual", "E5506": "Xperia C5 Ultra", "E5553": "Xperia C5 Ultra", "E5533": "Xperia C5 Ultra Dual", "E5563": "Xperia C5 Ultra Dual", "C1504": "Xperia E", "C1505": "Xperia E", "C1604": "Xperia E dual", "C1605": "Xperia E dual", "D2004": "Xperia E1", "D2005": "Xperia E1", "D2104": "Xperia E1 dual", "D2105": "Xperia E1 dual", "D2202": "Xperia E3", "D2203": "Xperia E3", "D2206": "Xperia E3", "D2243": "Xperia E3", "D2212": "Xperia E3 Dual", "E2053": "Xperia E4g", "E2033": "Xperia E4g Dual", "E2043": "Xperia E4g Dual", "F3311": "Xperia E5", "F3313": "Xperia E5", "ST27a": "Xperia Go", "ST27i": "Xperia go", "G1209": "Xperia Hello", "ST26a": "Xperia J", "ST26i": "Xperia J", "D5788": "Xperia J1 Compact", "C2104": "Xperia L", "C2105": "Xperia L", "G3311": "Xperia L1", "G3312": "Xperia L1", "G3313": "Xperia L1", "H3311": "Xperia L2", "H3321": "Xperia L2", "H4311": "Xperia L2", "H4331": "Xperia L2", "C1904": "Xperia M", "C2005": "Xperia M dual", "C2004": "Xperia M dual", "D2303": "Xperia M2", "D2305": "Xperia M2", "D2306": "Xperia M2", "D2403": "Xperia M2 Aqua", "D2406": "Xperia M2 Aqua", "D2302": "Xperia M2 dual", "E5603": "Xperia M5", "E5606": "Xperia M5", "E5653": "Xperia M5", "E5633": "Xperia M5 Dual", "E5643": "Xperia M5 Dual", "E5663": "Xperia M5 Dual", "ST23i": "Xperia miro", "LT22i": "Xperia P", "R800a": "Xperia PLAY", "R800i": "Xperia Play", "G2199": "Xperia R1", "G2299": "Xperia R1 Plus", "LT26i": "Xperia S", "LT26ii": "Xperia SL", "C5302": "Xperia SP", "C5303": "Xperia SP", "C5306": "Xperia ZR", "M35h": "Xperia SP", "M35t": "Xperia SP", "LT30a": "Xperia T", "LT30p": "Xperia T", "D5303": "Xperia T2 Ultra", "D5306": "Xperia T2 Ultra", "D5316": "Xperia T2 Ultra", "D5316N": "Xperia T2 Ultra", "D5322": "Xperia T2 Ultra dual", "D5102": "Xperia T3", "D5103": "Xperia T3", "D5106": "Xperia T3", "LT29i": "Xperia TX", "SGPT12": "Xperia Tablet S", "SGPT13": "Xperia Tablet S", "SGP311": "Xperia Tablet Z", "SGP312": "Xperia Tablet Z", "SGP321": "Xperia Tablet Z", "SGP351": "Xperia Tablet Z", "ST21i": "Xperia tipo", "ST21i2": "Xperia tipo dual", "G1109": "Xperia Touch", "ST25a": "Xperia U", "ST25i": "Xperia U", "LT25i": "Xperia V", "F5121": "Xperia X", "F5122": "Xperia X", "F5321": "Xperia X Compact", "SO-02J": "Xperia X Compact", "502SO": "Xperia X Performance", "F8131": "Xperia X Performance", "F8132": "Xperia X Performance", "SO-04H": "Xperia X Performance", "SOV33": "Xperia X Performance", "F3111": "Xperia XA", "F3112": "Xperia XA", "F3113": "Xperia XA", "F3115": "Xperia XA", "F3116": "Xperia XA", "F3211": "Xperia XA Ultra", "F3212": "Xperia XA Ultra", "F3213": "Xperia XA Ultra", "F3215": "Xperia XA Ultra", "F3216": "Xperia XA Ultra", "G3112": "Xperia XA1", "G3116": "Xperia XA1", "G3121": "Xperia XA1", "G3123": "Xperia XA1", "G3125": "Xperia XA1", "G3412": "Xperia XA1 Plus", "G3416": "Xperia XA1 Plus", "G3421": "Xperia XA1 Plus", "G3423": "Xperia XA1 Plus", "G3426": "Xperia XA1 Plus", "G3212": "Xperia XA1 Ultra", "G3221": "Xperia XA1 Ultra", "G3223": "Xperia XA1 Ultra", "G3226": "Xperia XA1 Ultra", "H3113": "Xperia XA2", "H3123": "Xperia XA2", "H3133": "Xperia XA2", "H4113": "Xperia XA2", "H4133": "Xperia XA2", "H3413": "Xperia XA2 Plus", "H4413": "Xperia XA2 Plus", "H4493": "Xperia XA2 Plus", "H3213": "Xperia XA2 Ultra", "H3223": "Xperia XA2 Ultra", "H4213": "Xperia XA2 Ultra", "H4233": "Xperia XA2 Ultra", "601SO": "Xperia XZ", "F8331": "Xperia XZ", "F8332": "Xperia XZ", "SO-01J": "Xperia XZ", "SOV34": "Xperia XZ", "G8141": "Xperia XZ Premium", "G8142": "Xperia XZ Premium", "G8188": "Xperia XZ Premium", "SO-04J": "Xperia XZ Premium", "701SO": "Xperia XZ1", "G8341": "Xperia XZ1", "G8342": "Xperia XZ1", "G8343": "Xperia XZ1", "SO-01K": "Xperia XZ1", "SOV36": "Xperia XZ1", "G8441": "Xperia XZ1 Compact", "SO-02K": "Xperia XZ1 Compact", "702SO": "Xperia XZ2", "H8216": "Xperia XZ2", "H8266": "Xperia XZ2", "H8276": "Xperia XZ2", "H8296": "Xperia XZ2", "SO-03K": "Xperia XZ2", "SOV37": "Xperia XZ2", "H8314": "Xperia XZ2 Compact", "H8324": "Xperia XZ2 Compact", "SO-05K": "Xperia XZ2 Compact", "H8116": "Xperia XZ2 Premium", "H8166": "Xperia XZ2 Premium", "SO-04K": "Xperia XZ2 Premium", "SOV38": "Xperia XZ2 Premium", "602SO": "Xperia XZs", "G8231": "Xperia XZs", "G8232": "Xperia XZs", "SO-03J": "Xperia XZs", "SOV35": "Xperia XZs", "C6602": "Xperia Z", "C6603": "Xperia Z", "C6606": "Xperia Z", "C6616": "Xperia Z", "L36h": "Xperia Z", "SO-02E": "Xperia Z", "C6802": "Xperia Z Ultra", "C6806": "Xperia Z Ultra", "C6833": "Xperia Z Ultra", "C6843": "Xperia Z Ultra", "SGP412": "Xperia Z Ultra", "SOL24": "Xperia Z Ultra", "XL39h": "Xperia Z Ultra", "C6902": "Xperia Z1", "C6903": "Xperia Z1", "C6906": "Xperia Z1", "C6916": "Xperia Z1", "C6943": "Xperia Z1", "L39h": "Xperia Z1", "L39t": "Xperia Z1", "L39u": "Xperia Z1", "SO-01F": "Xperia Z1", "SOL23": "Xperia Z1", "D5503": "Xperia Z1 Compact", "M51w": "Xperia Z1 Compact", "SO-02F": "Xperia Z1f", "D6502": "Xperia Z2", "D6503": "Xperia Z2", "D6543": "Xperia Z2", "SO-03F": "Xperia Z2", "SGP511": "Xperia Z2 Tablet", "SGP512": "Xperia Z2 Tablet", "SGP521": "Xperia Z2 Tablet", "SGP551": "Xperia Z2 Tablet", "SGP561": "Xperia Z2 Tablet", "SO-05F": "Xperia Z2 Tablet", "SOT21": "Xperia Z2 Tablet", "D6563": "Xperia Z2a", "401SO": "Xperia Z3", "D6603": "Xperia Z3", "D6616": "Xperia Z3", "D6643": "Xperia Z3", "D6646": "Xperia Z3", "D6653": "Xperia Z3", "SO-01G": "Xperia Z3", "SOL26": "Xperia Z3", "D5803": "Xperia Z3 Compact", "D5833": "Xperia Z3 Compact", "SO-02G": "Xperia Z3 Compact", "D6633": "Xperia Z3 Dual", "D6683": "Xperia Z3 Dual", "SGP611": "Xperia Z3 Tablet Compact", "SGP612": "Xperia Z3 Tablet Compact", "SGP621": "Xperia Z3 Tablet Compact", "SGP641": "Xperia Z3 Tablet Compact", "E6553": "Xperia Z3+", "E6533": "Xperia Z3+ Dual", "D6708": "Xperia Z3v", "402SO": "Xperia Z4", "SO-03G": "Xperia Z4", "SOV31": "Xperia Z4", "SGP712": "Xperia Z4 Tablet", "SGP771": "Xperia Z4 Tablet", "SO-05G": "Xperia Z4 Tablet", "SOT31": "Xperia Z4 Tablet", "E6508": "Xperia Z4v", "501SO": "Xperia Z5", "E6603": "Xperia Z5", "E6653": "Xperia Z5", "SO-01H": "Xperia Z5", "SOV32": "Xperia Z5", "E5803": "Xperia Z5 Compact", "E5823": "Xperia Z5 Compact", "SO-02H": "Xperia Z5 Compact", "E6853": "Xperia Z5 Premium", "E6883": "Xperia Z5 Premium", "SO-03H": "Xperia Z5 Premium", "E6633": "Xperia Z5 dual", "E6683": "Xperia Z5 dual", "C6502": "Xperia ZL", "C6503": "Xperia ZL", "C6506": "Xperia ZL", "L35h": "Xperia ZL", "SOL25": "Xperia ZL2", "C5502": "Xperia ZR", "C5503": "Xperia ZR", "SO-03D": "Xperia acro HD", "LT26w": "Xperia acro S", "ST17i": "Xperia active", "LT18i": "Xperia arc S", "LT28h": "Xperia ion", "LT28i": "Xperia ion", "SK17a": "Xperia mini pro", "ST23a": "Xperia miro", "MT25i": "Xperia neo L", "MK16i": "Xperia pro", "ST18i": "Xperia ray", "MT27i": "Xperia sola", "ST21a": "Xperia tipo", "ST21a2": "Xperia tipo dual", "E5303": "Xperia™ C4", "E5306": "Xperia™ C4", "E5353": "Xperia™ C4", "E5333": "Xperia™ C4 Dual", "E5343": "Xperia™ C4 Dual", "E5363": "Xperia™ C4 Dual", "E2104": "Xperia™ E4", "E2105": "Xperia™ E4", "E2115": "Xperia™ E4 Dual", "E2124": "Xperia™ E4 Dual", "E2003": "Xperia™ E4g", "E2006": "Xperia™ E4g", "E2303": "Xperia™ M4 Aqua", "E2306": "Xperia™ M4 Aqua", "E2353": "Xperia™ M4 Aqua", "E2312": "Xperia™ M4 Aqua Dual", "E2333": "Xperia™ M4 Aqua Dual", "E2363": "Xperia™ M4 Aqua Dual", "E10i": "Xperia X10 Mini", "SO-01E": "Xperia AX", "IS11S": "Xperia Acro", "SO-02C": "Xperia Acro", "LT15i": "Xperia arc", "SO-01C": "Xperia Arc", "S39h": "Xperia C", "SO-04D": "Xperia GX", "MT15i": "Xperia neo", "R800at": "Xperia PLAY", "R800x": "Xperia PLAY", "SO-01D": "Xperia PLAY", "Zeus": "Xperia Play", "SO-02D": "Xperia S", "M35c": "Xperia SP", "SO-05D": "Xperia SX", "LT30at": "Xperia T", "SGP341": "Xperia Tablet Z", "SO-03E": "Xperia Tablet Z", "SOL22": "Xperia UL", "LT25c": "Xperia V", "SOL21": "Xperia VL", "SO-01B": "Xperia X10", "X10i": "Xperia X10", "X10a": "Xperia X10", "U20i": "Xperia X10 Mini Pro", "E10a": "Xperia X10 mini", "U20a": "Xperia X10 mini pro", "E15i": "Xperia X8", "IS12S": "Xperia acro HD", "LT15a": "Xperia arc", "LT18a": "Xperia arc S", "LT28at": "Xperia ion", "S51SE": "Xperia mini", "ST15a": "Xperia mini", "ST15i": "Xperia mini", "SK17i": "Xperia mini pro", "MT15a": "Xperia neo", "MT11a": "Xperia neo V", "MT11i": "Xperia neo V", "MK16a": "Xperia pro", "SO-03C": "Xperia ray", "ST18a": "Xperia ray", "Connect504": "Connect 504", "Smarttab_9701": "Key\\'TAB 1001", "Smart_TAB_1003s": "ST1003S", "SmartTab1005": "Smart TAB 1005", "SmartTab_1004_XS": "Smart Tab 1004XS", "SmartTab1006": "Smart\\' Tab 1006", "Webpad_1002_02": "Web\\'Pad_1002_02", "Wooze_I5": "Wooze I 5", "Wooze_I55": "Wooze I 5.5 Gris", "Wooze_L": "Wooze L", "Wooze_XL": "Wooze XL", "Webpad_7005": "webpad_7005", "a500": "A500", "EM756": "Emerson EM756", "M10/Q1010": "M10", "L10": "Polaroid L10/P1000", "M11": "Polaroid M11", "P700/A700": "Polaroid P700/A700", "P902/A900": "Polaroid P902/A900", "P600": "Polaroid Power P600", "S50": "Polaroid Snap S50", "ST10/ST10x": "Smartab ST10", "ST7/ST7x": "Smartab ST7", "X13": "Streamachine", "Ranger5": "Spectra Ranger 5", "Ranger8": "Ranger 8 Handheld", "Versity 9540": "Versity", "Versity 9553": "Versity", "Versity 9640": "Versity", "Versity 9653": "Versity", "Spice Mi-498": "Dream Uno", "Spice Mi-498H": "Dream Uno", "Spice F301": "F301", "Spice F302": "F302", "Spice F305": "F305", "Spice K601": "K601", "SpiceMi-449": "Smart Flo Mi-449", "MI-438": "Stellar Mi-438", "Spice Mi-506": "Stellar Mi-506", "Spice V801": "V801", "Xlife-Victor5": "Victor5", "Xlife-415": "Xlife-441Q", "Xlife-Proton5 Pro": "Xlife-Proton 5 pro", "2PYB2": "HTC Bolt", "AQT80": "Slate 8 Tablet", "UP_Groove": "UP Groove", "UP_Selfie": "UP Selfie", "UP_Xtreme": "UP Xtreme", "I_STAR_PLUS": "I STAR PLUS", "STARPLUS7": "Starplus 7", "Tab7Q11": "eZee\\'Tab7Q11-M", "IRON Pro": "Iron Pro", "TAB-A03-SD": "TAB-A03", "STYLO S551": "S551", "MAX": "STYLO MAX", "STYLO F1": "STYLOF1", "STYLO SM61 MAGIC+": "STYLO_S61", "STYLO SV61 VECTOR+": "STYLO_S61", "ETAB I1041G": "FUNDA", "ETAB_I7041G": "FUNDA", "Rida_SP5003G_LTE": "Rida SP5003G LTE", "Sumo_SP5201G_LTE": "Sumo SP5201G LTE", "Symbol_SP4002G": "Symbol SP4002G", "WIN4": "Wintech", "SUGAR": "Sugar", "SURTAB_74G": "SURTAB", "sweam": "Sweam", "EliteDual": "Elite Dual", "Elite_VR": "Elite VR", "Symphony P7 PRO": "P7 Pro", "P9 Plus": "P9+", "Symphony R100": "R100", "Roar_A50": "Roar A50", "Symphony Z9": "Symphony_Z9", "SYMPHONY Z10": "Z10", "Telekom Puls": "Telekom_Puls", "TA71CA5": "JP SA COUTO, S.A. _MG070A2T", "TAG Heuer": "Connected Modular 45 (China)", "5152D": "Alcatel 3", "movo_la": "L55E6700UDS", "movo": "LE50UHDE5692G", "Percee TV": "TCL  Percee TV", "SoshPhone_mini": "\\t ALCATEL ONETOUCH PIXI 3 (3.5)", "5017X": "\\t ALCATEL ONETOUCH PIXI 3 (4.5)", "5056M": "5056E", "ALCATEL_5080U": "5080U", "Alcatel_5098O": "5098O", "alcatel_5098O": "5098O", "6016A": "6010A", "J730U": "730U", "T600M": "8050E", "KR076": "8057", "ALCATEL ONE TOUCH 9002A": "9002A", "ALCATEL ONETOUCH POP 7 LTE": "9015W", "5046A": "A3", "5046D": "A3", "5046I": "A3", "5046J": "A3", "5046T": "A3", "5046U": "A3", "5046Y": "A3", "9026T": "A3 10\\'\\'", "9026X": "A3 10\\'\\'", "5049E": "A3 PLUS", "5049G": "A3 PLUS", "9008A": "A3 XL", "9008D": "A3 XL", "9008I": "A3 XL", "9008J": "A3 XL", "9008N": "A3 XL", "9008T": "A3 XL", "9008U": "A3 XL", "9008X": "A3 XL", "9108A": "A3 XL", "TCLGalaG60(9108A)": "A3 XL", "5046G": "A30", "A576RW": "A30", "5085A": "A5", "5085B": "A5", "5085D": "A5", "5085H": "A5", "5085I": "A5", "5085J": "A5", "5085N": "A5", "5085Q": "A5", "5085Y": "A5", "5090A": "A7", "5090I": "A7", "5090Y": "A7", "7071A": "A7 XL", "7071D": "A7 XL", "Alcatel 7030L": "A851L", "Alcatel A851L": "A851L", "5026A": "ALCATEL 3C", "5026D": "ALCATEL 3C", "5026J": "ALCATEL 3C", "5099Y": "ALCATEL 3V", "ALCATEL_ONE_TOUCH_4005D": "ALCATEL ONE TOUCH 4005D", "ALCATEL ONE TOUCH 4010A": "ALCATEL ONE TOUCH 4010X", "ALCATEL ONE TOUCH 4010D": "ALCATEL ONE TOUCH 4010X", "ALCATEL ONE TOUCH 4010E": "ALCATEL ONE TOUCH 4010X", "TCL_J210": "ALCATEL ONE TOUCH 4010X", "Telenor Smart 2": "ALCATEL ONE TOUCH 4010X", "ALCATEL ONE TOUCH 4029A": "ALCATEL ONE TOUCH 4030X", "ALCATEL ONE TOUCH 4030D": "ALCATEL ONE TOUCH 4030X", "ALCATEL ONE TOUCH 4030E": "ALCATEL ONE TOUCH 4030X", "ALCATEL ONE TOUCH 4030Y": "ALCATEL ONE TOUCH 4030X", "ALCATEL ONE TOUCH 4030Y_orange": "ALCATEL ONE TOUCH 4030X", "Infinity POP": "ALCATEL ONE TOUCH 4030X", "Orange Runo": "ALCATEL ONE TOUCH 4030X", "ALCATEL ONE TOUCH 4037T": "ALCATEL ONE TOUCH 4037N", "ALCATEL ONE TOUCH 5020A": "ALCATEL ONE TOUCH 5020D", "ALCATEL ONE TOUCH 5020E": "ALCATEL ONE TOUCH 5020D", "ALCATEL ONE TOUCH 5020T": "TCL J300", "ALCATEL ONE TOUCH 5020W": "ALCATEL ONE TOUCH 5020D", "ALCATEL ONE TOUCH 5020X": "ALCATEL ONE TOUCH 5020D", "ALCATEL ONE TOUCH 5021E": "ALCATEL ONE TOUCH 5020D", "ALCATEL_ONE_TOUCH_5020D_Orange": "ALCATEL ONE TOUCH 5020D", "ALCATEL_ONE_TOUCH_5020X_Orange": "ALCATEL ONE TOUCH 5020D", "AURUS III": "ALCATEL ONE TOUCH 5020D", "MTC 972": "ALCATEL ONE TOUCH 5020D", "Orange Kivo": "ALCATEL ONE TOUCH 5020D", "Telenor Smart Pro 2": "ALCATEL ONE TOUCH 5020D", "ALCATEL ONE TOUCH 5035A": "ALCATEL ONE TOUCH 5035D", "ALCATEL ONE TOUCH 5035E": "ALCATEL ONE TOUCH 5035D", "ALCATEL ONE TOUCH 5035X": "ALCATEL ONE TOUCH 5035D", "TCL J610": "ALCATEL ONE TOUCH 5035D", "TCL S810": "ALCATEL ONE TOUCH 5035D", "ONE TOUCH 5036X": "ALCATEL ONE TOUCH 5036D", "ALCATEL ONE TOUCH 6010": "ALCATEL ONE TOUCH 6010X", "ALCATEL ONE TOUCH 6010D": "ALCATEL ONE TOUCH 6010X", "ALCATEL ONE TOUCH 6010X-orange": "ALCATEL ONE TOUCH 6010X", "TCL S520": "ALCATEL ONE TOUCH 6010X", "ALCATEL ONE TOUCH 6030A": "ALCATEL ONE TOUCH 6030X", "ALCATEL ONE TOUCH 6030D": "ALCATEL ONE TOUCH 6030X", "ALCATEL ONE TOUCH 6030X-orange": "ALCATEL ONE TOUCH 6030X", "ALCATEL_ONE_TOUCH_6030X_Orange": "ALCATEL ONE TOUCH 6030X", "Optimus_San_Remo": "ALCATEL ONE TOUCH 6030X", "TCL S820": "ALCATEL ONE TOUCH 6030X", "ALCATEL ONE TOUCH 6033M": "ALCATEL ONE TOUCH 6033X", "TCL S850": "ALCATEL ONE TOUCH 6033X", "TCL S950": "ALCATEL ONE TOUCH 6040D", "ALCATEL ONE TOUCH 7024R": "ALCATEL ONE TOUCH 7024W", "ALCATEL ONE TOUCH FIERCE": "ALCATEL ONE TOUCH 7024W", "ALCATEL ONE TOUCH 8008X": "ALCATEL ONE TOUCH 8008D", "Orange Infinity 8008X": "ALCATEL ONE TOUCH 8008D", "ALCATEL_ONE_TOUCH_903": "ALCATEL ONE TOUCH 903", "ALCATEL_one_touch_903": "ALCATEL ONE TOUCH 903", "ALCATEL ONE TOUCH 903D": "ALCATEL ONE TOUCH 903", "ALCATEL one touch 918": "ALCATEL ONE TOUCH 918", "ALCATEL_one_touch_918": "ALCATEL ONE TOUCH 918", "Alcatel_one_touch_918_Orange": "ALCATEL ONE TOUCH 918", "ALCATEL_one_touch_918A": "ALCATEL ONE TOUCH 918A", "ALCATEL ONE TOUCH 930N": "ALCATEL ONE TOUCH 930D", "ALCATEL_ONE_TOUCH_985": "ALCATEL ONE TOUCH 985", "ALCATEL_one_touch_985": "Alcatel one touch 985", "Telenor_One_Touch_C": "ALCATEL ONE TOUCH 985", "ALCATEL ONE TOUCH 991D": "ALCATEL ONE TOUCH 991", "ALCATEL_one_touch_991": "ALCATEL ONE TOUCH 991", "Telenor_Smart_Pro": "ALCATEL ONE TOUCH 991", "ALCATEL ONE TOUCH 992": "ALCATEL ONE TOUCH 992D", "TCL S500": "ALCATEL ONE TOUCH 992D", "TCL S600": "ALCATEL ONE TOUCH 992D", "ALCATEL_one_touch_995": "ATEL ONE TOUCH 995", "Optimus_Madrid": "ALCATEL ONE TOUCH 995", "Telenor_Smart_HD": "ALCATEL_one_touch_995", "ALCATEL_one_touch_995A": "ALCATEL ONE TOUCH 995A", "ALCATEL ONE TOUCH 997": "ALCATEL ONE TOUCH 997D", "BASE_Lutea_3": "ALCATEL ONE TOUCH 997D", "TCL S710": "ALCATEL ONE TOUCH 997D", "TCL S800": "ALCATEL ONE TOUCH 997D", "TCL D668": "ALCATEL ONE TOUCH D668", "TCL-D668": "ALCATEL ONE TOUCH D668", "ALCATEL ONE TOUCH 7024N": "ALCATEL ONE TOUCH Fierce", "ALCATEL ONE TOUCH 7024W": "ALCATEL ONE TOUCH Fierce", "ALCATEL ONE TOUCH 918N": "ALCATEL ONE TOUCH918N", "ALCATEL ONE TOUCH 4037R": "ALCATEL ONETOUCH 4037R", "6045B": "ALCATEL ONETOUCH IDOL 3 (5.5)", "6045F": "ALCATEL ONETOUCH IDOL 3 (5.5)", "6045I": "ALCATEL ONETOUCH IDOL 3 (5.5)", "6045K": "ALCATEL ONETOUCH IDOL 3 (5.5)", "6045Y": "ALCATEL ONETOUCH IDOL 3 (5.5)", "TCL i806": "ALCATEL ONETOUCH IDOL 3 (5.5)", "ALCATEL ONE TOUCH P310A": "ALCATEL ONETOUCH P310A", "4009A": "ALCATEL ONETOUCH PIXI 3 (3.5)", "4009D": "ALCATEL ONETOUCH PIXI 3 (3.5)", "4009E": "ALCATEL ONETOUCH PIXI 3 (3.5)", "4009F": "ALCATEL ONETOUCH PIXI 3 (3.5)", "4009K": "ALCATEL ONETOUCH PIXI 3 (3.5)", "4009M": "ALCATEL ONETOUCH PIXI 3 (3.5)", "4009S": "ALCATEL ONETOUCH PIXI 3 (3.5)", "4009X": "ALCATEL ONETOUCH PIXI 3 (3.5)", "5017A": "ALCATEL ONETOUCH PIXI 3 (4.5)", "5017D": "ALCATEL ONETOUCH PIXI 3 (4.5)", "5017E": "ALCATEL ONETOUCH PIXI 3 (4.5)", "5019D": "ALCATEL ONETOUCH PIXI 3 (4.5)", "4034A": "ALCATEL ONETOUCH PIXI 4 (4)", "4034D": "ALCATEL ONETOUCH PIXI 4 (4)", "4034E": "ALCATEL ONETOUCH PIXI 4 (4)", "4034F": "ALCATEL ONETOUCH PIXI 4 (4)", "4034G": "ALCATEL ONETOUCH PIXI 4 (4)", "4034X": "ALCATEL ONETOUCH PIXI 4 (4)", "Alcatel_4034F": "ALCATEL ONETOUCH PIXI 4 (4)", "DIGICEL DL 1 lite": "ALCATEL ONETOUCH PIXI 4 (4)", "Orange Rise 34": "ALCATEL ONETOUCH PIXI 4 (4)", "5017O": "ALCATEL ONETOUCH PIXI™ 3 (4.5)", "5015A": "ALCATEL ONETOUCH POP 3 (5)", "5015D": "ALCATEL ONETOUCH POP 3 (5)", "5015E": "ALCATEL ONETOUCH POP 3 (5)", "5015X": "ALCATEL ONETOUCH POP 3 (5)", "5016A": "ALCATEL ONETOUCH POP 3 (5)", "5016J": "ALCATEL ONETOUCH POP 3 (5)", "5116J": "ALCATEL ONETOUCH POP 3 (5)", "5025D": "ALCATEL ONETOUCH POP 3 (5.5)", "5025E": "ALCATEL ONETOUCH POP 3 (5.5)", "5025G": "ALCATEL ONETOUCH POP 3 (5.5)", "5025X": "ALCATEL ONETOUCH POP 3 (5.5)", "DIGICEL DL1000": "ALCATEL ONETOUCH POP 3 (5.5)", "S4035 3G": "ALCATEL ONETOUCH POP 3 (5.5)", "Alcatel 7046T": "ALCATEL ONETOUCH Victory", "5041D": "ALCATEL PIXI 4 (5)", "5045A": "ALCATEL PIXI 4 (5)", "5045D": "ALCATEL PIXI 4 (5)", "5045F": "ALCATEL PIXI 4 (5)", "5045G": "ALCATEL PIXI 4 (5)", "5045I": "ALCATEL PIXI 4 (5)", "5045J": "ALCATEL PIXI 4 (5)", "5045T": "ALCATEL PIXI 4 (5)", "5045X": "ALCATEL PIXI 4 (5)", "5045Y": "ALCATEL PIXI 4 (5)", "5145A": "ALCATEL PIXI 4 (5)", "DIGICELDL1": "ALCATEL PIXI 4 (5)", "ALCATEL_4034A": "ALCATEL_ 4034A", "7053D": "ALCATEL_ONETOUCH_7053D", "ALCATEL ONE TOUCH 4027A": "ALCATEL_ONE_TOUCH_4027A", "ALCATEL ONE TOUCH 5037A": "ALCATEL_ONE_TOUCH_5037A", "ALCATEL ONE TOUCH 5037X": "ALCATEL_ONE_TOUCH_5037X", "ALCATEL ONE TOUCH 7047A": "ALCATEL_ONE_TOUCH_7047A", "ALCATEL ONE TOUCH P310X": "ONE_TOUCH_P310X", "ALCATEL ONE TOUCH P320X": "ALCATEL_ONE_TOUCH_P320X", "RPSPE4301": "ALCATEL_one_touch_995", "Telenor_One_Touch_S": "ALCATEL_one_touch_995", "5033A": "Alcatel 1", "5033D": "Alcatel 1", "5033D_RU": "Alcatel 1", "5033J": "Alcatel 1", "5033O": "Alcatel 1", "5033T": "Alcatel 1", "5033X": "Alcatel 1", "5033Y": "Alcatel 1", "Alcatel T 5033T": "Alcatel 1", "5009A": "Alcatel 1C", "5009D": "Alcatel 1C", "5009D_RU": "Alcatel 1C", "5009U": "Alcatel 1C", "5059A": "Alcatel 1X", "5059D": "Alcatel 1X", "5059D_RU": "Alcatel 1X", "5059I": "Alcatel 1X", "5059J": "Alcatel 1X", "5059T": "Alcatel 1X", "5059X": "Alcatel 1X", "5059Y": "Alcatel 1X", "5159A": "Alcatel 1X", "5159J": "Alcatel 1X", "5052A": "Alcatel 3", "5052D": "Alcatel 3", "5052D_RU": "Alcatel 3", "5052Y": "Alcatel 3", "Orange Dive 73": "Alcatel 3", "5034D": "Alcatel 3L", "5034D_RU": "Alcatel 3L", "5099A": "Alcatel 3V", "5099D": "Alcatel 3V", "5099D_RU": "Alcatel 3V", "5099I": "Alcatel 3V", "5099U": "Alcatel 3V", "5058A": "Alcatel 3X", "5058I": "Alcatel 3X", "5058I_RU": "Alcatel 3X", "5058J": "Alcatel 3X", "5058T": "Alcatel 3X", "5058Y": "Alcatel 3X", "5158A": "Alcatel 3X", "5086A": "Alcatel 5", "5086D": "Alcatel 5", "5086Y": "Alcatel 5", "5186A": "Alcatel 5", "5186D": "Alcatel 5", "5060A": "Alcatel 5V", "5060D_RU": "Alcatel 5V", "5060D": "Alcatel 5X", "A574BL": "Alcatel Raven LTE", "Alcatel 5085C": "Alcatel_5085C", "Alcatel 6055U": "Alcatel_6055U", "Alcatel 9026S": "Alcatel_9026S", "TCL V760": "CTCC: TCL Y660/CMCC: TCL V760", "TCL Y660": "CTCC: TCL Y660/CMCC: TCL V760", "DIGICELDL1plus": "DLGICELDL1 plus", "Alcatel_5044R": "ELEMENT5", "MTC 1065": "EVO7", "onetouch EVO7": "EVO7", "starTIM tab 7": "EVO7", "FL02": "Flash Plus 2", "7048A": "Go PLAY", "7048S": "Go PLAY", "7048W": "Go PLAY", "7048X": "Go PLAY", "7055A": "Hero2C", "6050Y": "IDOL 2 S", "ALCATEL ONE TOUCH 6050Y": "IDOL 2 S", "Idol2S_Orange": "IDOL 2 S", "6050A": "IDOL 2 S", "6050F": "IDOL 2 S", "6050W": "IDOL 2 S", "ALCATEL ONETOUCH 6050A": "IDOL 2 S", "OWN S5030": "IDOL 2 S", "TCL S830U": "IDOL 2 S", "TCL S838M": "IDOL 2 S", "6070K": "IDOL 4S", "6070O": "IDOL 4S", "6058A": "IDOL 5", "6058D": "IDOL 5", "6058X": "IDOL 5", "6060S": "IDOL 5S", "ALCATEL ONE TOUCH 6035L": "Idol S", "BS472": "Idol S", "MTC 978": "Idol S", "ALCATEL ONE TOUCH 6034L": "Idol S", "ALCATEL ONE TOUCH 6034M": "Idol S", "ALCATEL ONE TOUCH 6034R": "Idol S", "ALCATEL ONE TOUCH 6034Y": "Idol S", "San Remo 4G": "Idol S", "TCL-S850L": "Idol S", "ALCATEL ONE TOUCH 6035R": "Idol X", "6036A": "Idol2 MINI S", "6036X": "Idol2 MINI S", "6036Y": "Idol2 MINI S", "A554C": "Juke-A554C", "DIGICEL DL810": "LCATEL ONETOUCH PIXI 3 (4.5)", "MegaFon_SP-AI": "Megafon Login", "5057M": "Mirage", "move 2": "Moov2", "VFD 500": "Smart turbo 7", "Maxis VFD 700": "NeXT by Maxis (M1)", "VFD 700": "Smart ultra 7", "VFD700": "NeXT by Maxis (M1)", "6045O": "Nitro", "Alcatel_4060O": "No", "ONE TOUCH 4007A": "ONE TOUCH 4007X", "ONE TOUCH 4007D": "ONE TOUCH 4007X", "ONE TOUCH 4007E": "ONE TOUCH 4007X", "4016D": "ONE TOUCH 4015X", "ONE TOUCH 4015A": "ONE TOUCH 4015X", "ONE TOUCH 4015D": "ONE TOUCH 4015X", "ONE TOUCH 4015N": "ONE TOUCH 4015X", "ONE TOUCH 4015X-orange": "ONE TOUCH 4015X", "ONE TOUCH 4016A": "ONE TOUCH 4015X", "Orange Yomi": "ONE TOUCH 4015X", "4032A": "ONE TOUCH 4033X", "4032D": "ONE TOUCH 4033X", "4032E": "ONE TOUCH 4033X", "4032X": "ONE TOUCH 4033X", "4033L": "ONE TOUCH 4033X", "MS3B": "ONE TOUCH 4033X", "ONE TOUCH 4032A": "ONE TOUCH 4033X", "ONE TOUCH 4033A": "ONE TOUCH 4033X", "ONE TOUCH 4033D": "ONE TOUCH 4033X", "ONE TOUCH 4033E": "ONE TOUCH 4033X", "OWN S3010": "ONE TOUCH 4033X", "OWN S3010D": "ONE TOUCH 4033X", "TCLJ330": "ONE TOUCH 4033X", "ALCATEL ONE TOUCH 6012D": "ONE TOUCH 6012D", "ALCATEL ONE TOUCH 6012X": "ONE TOUCH 6012D", "Mobile Sosh": "ONE TOUCH 6012D", "ONE TOUCH 6012A": "ONE TOUCH 6012D", "ONE TOUCH 6012E": "ONE TOUCH 6012D", "ONE TOUCH 6012X": "ONE TOUCH 6012D", "ONE TOUCH IDOL MINI": "ONE TOUCH 6012D", "Orange Covo": "ONE TOUCH 6012D", "Orange Hiro": "ONE TOUCH 6012D", "ALCATEL_one_touch_983": "ONE TOUCH 983", "VALENCIA": "ONE TOUCH 983", "MTC 1078": "ONE TOUCH EVO7HD", "ONE TOUCH E710": "ONE TOUCH EVO7HD", "ONE TOUCH EVO7HD": "ONE TOUCH EVO8HD", "ALCATEL ONE TOUCH 8000A": "ONE TOUCH SCRIBE 5", "ALCATEL ONE TOUCH 8000D": "ONE TOUCH SCRIBE 5", "TCL Y710": "ONE TOUCH SCRIBE 5", "GR-TB7": "ONE TOUCH T10", "TCL TAB 7": "ONE TOUCH TAB 7", "ONE_TOUCH_960C": "ONE TOUCH Ultra 960c", "ADR3010": "ONE TOUCH Ultra 960c", "ONE TOUCH 960C": "ONE TOUCH Ultra 960c", "9022S": "ONETOUCH PIXI 3 (8)", "9022X": "ONETOUCH PIXI 3 (8)", "Alcatel9022S": "ONETOUCH PIXI 3 (8)", "Alcatel_9022S": "ONETOUCH PIXI 3 (8)", "9007A": "ONETOUCH PIXI3(7)", "9007X": "ONETOUCH PIXI3(7)", "ONE TOUCH P310A": "ONE_TOUCH_P310A", "ALCATEL one touch 890D": "One Touch 890D", "ALCATEL_one_touch_906Y": "One Touch 906", "ALCATEL ONE TOUCH 908": "One Touch 908", "ALCATEL_one_touch_908": "One Touch 908", "Alcatel_one_touch_908F_Orange": "One Touch 908", "ALCATEL ONE TOUCH 990": "One Touch 990", "ALCATEL one touch 990": "One Touch 990", "ALCATEL_one_touch_990": "One Touch 990", "Alcatel one touch 908F Orange": "One Touch 990", "Alcatel one touch 990 Orange": "One Touch 990", "Los Angeles": "One Touch 990", "TCL A990": "One Touch 990", "TCL ONE TOUCH 990": "One Touch 990", "Telenor_OneTouch": "One Touch 990", "Vodafone 958": "One Touch 990", "ALCATEL_one_touch_990A": "One Touch 990A", "ALCATEL_one_touch_990S": "One Touch 990S", "Alcatel one touch 990S": "One Touch 990S", "TCL-P688L": "P688L", "TOM007": "P688L", "5010D": "PIXI 4 (5)", "5010E": "PIXI 4 (5)", "5010G": "PIXI 4 (5)", "5010S": "PIXI 4 (5)", "5010U": "PIXI 4 (5)", "5010X": "PIXI 4 (5)", "A576CC": "PIXI 5 HD", "4003A": "PIXI3(4)", "4003J": "PIXI3(4)", "4013D": "PIXI3(4)", "4013E": "PIXI3(4)", "4013J": "PIXI3(4)", "4013K": "PIXI3(4)", "4013X": "PIXI3(4)", "4014E": "PIXI3(4)", "ONE_TOUCH_PIXI3": "PIXI3(4)", "ONE_TOUCH_PIXI3D": "PIXI3(4)", "4027A": "PIXI3(4.5)", "4027D": "PIXI3(4.5)", "4027N": "PIXI3(4.5)", "4027X": "PIXI3(4.5)", "4028A": "PIXI3(4.5)", "4028E": "PIXI3(4.5)", "4028J": "PIXI3(4.5)", "4028S": "PIXI3(4.5)", "4017A": "PIXI4 (3.5)", "4017D": "PIXI4 (3.5)", "4017F": "PIXI4 (3.5)", "4017S": "PIXI4 (3.5)", "4017X": "PIXI4 (3.5)", "4060S": "PIXI™4", "4024D": "PLAY_P1", "4024E": "PLAY_P1", "5042A": "POP 2", "5042D": "POP 2", "5042X": "POP 2", "7043A": "POP 2 (5)", "7043K": "POP 2 (5)", "7043Y": "POP 2 (5)", "7044A": "POP 2 (5)", "7044X": "POP 2 (5)", "7070I": "POP 4 6\" 4G android", "7070Q": "POP 4 6\" 4G android", "7070X": "POP 4 6\" 4G android", "5095I": "POP 4S", "5095K": "POP 4S", "5095Y": "POP 4S", "ALCATEL A845L": "POP S3", "5050A": "POP S3", "5050S": "POP S3", "5050X": "POP S3", "5050Y": "POP S3", "ALCATEL ONETOUCH 5050X": "POP S3", "Siru": "POP S3", "7050Y": "POP S9", "ALCATEL A995L": "POP S9", "STARXTREM II": "POP S9", "Smartphone Android by SFR STARXTREM II": "POP S9", "4045A": "POP2 (4)", "4045D": "POP2 (4)", "4045L": "POP2 (4)", "4045O": "POP2 (4)", "4045X": "POP2 (4)", "5042G": "POP2 (4.5)", "5042W": "POP2 (4.5)", "A463BG": "Pixi3-3.5 TF", "A460G": "Pixi3-4 TF", "A466T": "Pixi4-4 3G Telus", "I211": "Pixo 7", "I212": "Pixo 7", "I213": "Pixo 7", "Orange Rise 54": "Rise_54", "5080D": "SHINE LITE", "5080X": "SHINE LITE", "SMART_PLUS": "SMART_ PLUS", "T-1000": "SOL PRIME", "5038X": "SOUL 4.5", "Smartphone_Android_by_SFR_STARADDICT_II": "Smartphone Android by SFR STARADDICT II", "AM-H200": "Sol", "4018A": "Soul 3.5", "4018D": "Soul 3.5", "4018E": "Soul 3.5", "4018F": "Soul 3.5", "4018M": "Soul 3.5", "4018X": "Soul 3.5", "T4018": "Soul 3.5", "4035A": "Soul 4", "4035D": "Soul 4", "4035X": "Soul 4", "4035X_Orange": "Soul 4", "4035Y": "Soul 4", "4036E": "Soul 4", "5038A": "Soul 4.5", "5038E": "Soul 4.5", "D45": "Soul 4.5", "one touch T10": "T10", "T700A": "T2", "T700X": "T2", "TCL-J736L": "TCL 736L", "TCL J738M": "TCL 738M", "ALCATEL ONE TOUCH 993D": "TCL A988", "ALCATEL ONE TOUCH 993": "TCL A988", "MTC_968": "TCL A988", "TCL-D920": "TCL D920", "DL750": "TCL DL750", "TCL-J210C": "TCL J210C", "J630": "TCL J630", "TCL-J929L": "TCL J929L", "5133A": "TCL L5", "A502DL": "TCL LX", "TCL P600": "TCL P606", "TCL P606T": "TCL P606", "TCL_P689L": "TCL P689L", "TCL_S725T": "TCL S725T", "TCL i709M": "TCL i718M", "TCL 6110A": "TCL_6110A", "TCL Xess P17AA": "TCL_Xess_P17AA_OS", "5041C": "TETRA", "Telenor Smart Mini": "Telenor_Smart_Mini", "4049D": "U3", "4049E": "U3", "4049G": "U3", "4049M": "U3", "4049X": "U3", "5044A": "U5", "5044P": "U5", "5044Y": "U5", "4047A": "U5 3G", "4047F": "U5 3G", "5047D": "U5 HD", "5047I": "U5 HD", "5047U": "U5 HD", "5047Y": "U5 HD", "5044G": "U50™", "5044S": "U50™", "Vodafone Smart II": "VF 860", "ALCATEL ONE TOUCH 922": "Vodafone 861", "Vodafone 975": "Vodafone Smart III", "Vodafone 975N": "Vodafone Smart III (with NFC)", "TCL Xess miniC15BA": "Xess mini", "TCL Xess C15BA": "Xess-mini", "5012D": "alcatel PIXI 4 (5.5)", "5012F": "alcatel PIXI 4 (5.5)", "5012G": "alcatel PIXI 4 (5.5)", "5044D": "alcatel U5", "5044I": "alcatel U5", "5044K": "alcatel U5", "5044O": "alcatel U5", "5044T": "alcatel U5", "ALCATEL one touch D920": "one touch D920", "ALCATEL_one_touch_4030A": "one_touch_4030_TLVE", "one touch D920": "one_touch_D920_ALIQ", "A576BL": "tbd", "Alcatel_5059R": "tbd", "moche smart a8": "tmn smarta8", "tmn smart a8": "tmn smarta8", "TIM_BOX": "TIM BOX", "skipper": "LMT viedtelevīzijas iekārta", "Metal_Tablet_10": "Metal Tablet", "Quicktab": "QUICKTAB", "MTC_982O": "MTC 982o", "MG080D1T": "Tablet Tsunami TSTA080D1", "ITP-R408W": "DREAM PAD", "TU7_18222": "TU7_58212_18222", "2E E450 2018": "2E E450A 2018", "MID107": "MID 107", "Tanoshi 2-in-1": "TTBKB10-01", "S8_Pro": "S8 Pro", "AgileTV": "Agile TV", "cooper": "Euskaltel", "pearl": "NETBOX", "uiw4030dnm": "NETBOX", "WIND": "Wind", "M6Plus": "M6 Plus", "Techpad X5": "TECHPAD X5", "TechPad_10Y": "TechPad 10Y", "TechPad_9x": "TechPad 9x", "Techpad_i700": "TechPad_i700", "TECNO-A7S": "A7S", "TECNO-C5": "C5", "TECNO-C7": "C7", "TECNO-C8": "C8", "TECNO-C9": "C9", "TECNO-C9S": "C9S", "TECNO CA6": "CAMON CM", "TECNO IN1": "CAMON I Ace", "TECNO CA7": "CAMON X", "TECNO CA8": "CAMON X Pro", "TECNO CA8S": "CAMON X Pro", "TECNO IN6": "CAMON iClick", "TECNO IN2": "CAMON iSky", "TECNO IN1 Pro": "CAMON iSky2", "TECNO CA6S": "COMAN CM", "TECNO Camon CX": "Camon CX", "TECNO CX Air": "Camon CX Air", "TECNO Camon CXS": "Camon CXS", "TECNO IN5": "Camon I", "TECNO IN3": "Camon I Air", "TECNO IA5": "Camon i Twin", "DP10APro": "DroiPad 10 ProⅡ", "TECNO P904": "DroiPad 10D", "DP7CPRO": "DroiPad 7C Pro", "TECNO P701": "DroiPad 7D", "TECNO P702A": "DroiPad 7D ProLTE", "TECNO P702": "DroiPad 7D ProLTE", "DP8D": "DroiPad 8Ⅱ", "DP10A": "Droipad10", "TECNO DP10A": "Droipad10", "TECNO F1": "F1", "TECNO F2": "F2", "TECNO F2LTE": "F2LTE", "TECNO H5S": "H5S", "TECNO-J5": "J5", "TECNO-J7": "J7", "TECNO-J8": "J8", "TECNO-L5": "L5", "TECNO-L8": "L8", "TECNO L8 Lite": "L8 Lite", "TECNO-L8Plus": "L8Plus", "TECNO L9": "L9", "TECNO L9 Plus": "L9Plus", "TECNO M3S": "M3", "TECNO-M6S": "M6S", "TECNO-N2": "N2", "TECNO-N2S": "N2S", "TECNO N5S": "N5S", "TECNO-N6": "N6", "TECNO-N6S": "N6S", "TECNO N8": "N8", "TECNO-N8": "N8", "TECNO-N8R": "N8R", "TECNO-N8S": "N8S", "TECNO-N9": "N9", "TECNO-N9S": "N9S", "TECNO R8O": "NX", "TECNO R8S": "NX", "TECNO P5S": "P5", "TECNO P702AS": "P702AS", "PTM-Z-mini": "PHANTOM-Z-mini", "TECNO-PHANTOM5": "PHANTOM5", "TECNO F3": "POP1", "TECNO F4": "POP 1s", "TECNO F4 Pro": "POP 1s Pro", "Phantom6-Plus": "Phantom6 plus", "TECNO AX8": "Phantom8", "TECNO AX8S": "Phantom8S", "TECNO PhonePad 3": "PhonePad 3", "TECNO PP7E-DLA1": "PhonePad 7 II", "TECNO PP7E-SLA1": "PhonePad 7 II", "TECNO LA6": "Pouvoir 1", "TECNO LA7": "Pouvoir 2", "TECNO LA7 Pro": "Pouvoir 2 Pro", "TECNO R6": "R6", "TECNO RA6": "RA6", "TECNO RA6S": "RA6", "TECNO S1": "S1", "TECNO S1M": "S1", "TECNO S1 Pro": "S1 Pro", "TECNO S1E Pro": "S1E Pro", "TECNO SA1": "S2", "TECNO S6": "S6", "TECNO S6S": "S6s", "TECNO SA1S Pro": "SA1 Pro", "TECNO SA6": "SA6", "TECNO SA6S": "SA6", "TECNO K7": "SPARK", "TECNO KA7": "SPARK 2", "TECNO KA7O": "SPARK 2", "TECNO KA9": "SPARK CM", "TECNO K9": "SPARK Plus", "TECNO K8": "SPARK Pro", "TECNO-W5": "W5", "TECNO-Y3+": "Y3+", "TECNO-L6": "Techno L6", "TECNO W1": "W1", "TECNO W2": "W2", "TECNO-W3": "W3", "TECNO W3 Pro": "W3 Pro", "TECNO-W3LTE": "W3LTE", "TECNO_W4": "W4", "TECNO W5 Lite": "W5 Lite", "TECNO WX3": "WX3", "TECNO WX3F LTE": "WX3F LTE", "TECNO WX3LTE": "WX3LTE", "TECNO WX3P": "WX3P", "TECNO WX4": "WX4", "TECNO WX4 Pro": "WX4 Pro", "TECNO WX4 Pro S": "WX4 Pro S", "TECNO-Y3": "Y3", "TECNO-Y2": "Y3+", "TECNO-Y3S": "Y3S", "TECNO-Y4": "Y4", "TECNO-Y5": "Y5", "TECNO-Y6": "Y6", "TECNO i3": "i3", "TECNO i3 Pro": "i3-Pro", "TECNO i5": "i5", "TECNO i5 Pro": "i5-Pro", "TECNO i7": "i7", "Preo_P2": "Preo P2", "A10B": "Clide A10B", "Tele2_Maxi": "Maxi", "TELE2_Maxi_1_1": "Maxi 1.1", "Tele2_Maxi_Plus": "Maxi_Plus", "Tele2": "Midi", "Tele2_Midi_1_1": "Midi 1.1", "Tele2_Midi_LTE": "Midi LTE", "Tele2_Mini": "Mini", "Tele2_Mini_1.1": "Mini 1.1", "Tele2_Mini_1_1": "Mini 1.1", "Tele2_Maxi_LTE": "Tele 2 Maxi LTE", "Tele2fon v4": "Tele2fon V4", "Tele2fon v5": "Tele2fon V5", "Telecable ATV": "tedi", "SmartTAB 1002": "Essentiel B SmartTab 1002", "U680C": "UMX U680C", "TE1": "Enjoy TE1", "Infinity_K": "Infinity K", "Infinity_a2": "Infinity a2", "Infinity_e2": "Infinity e2", "Infinity_e3": "Infinity e3", "Infinity_k2": "Infinity k2", "Infinity i": "Infinity_i", "Telenor K530": "K530", "Telenor N940": "N940", "Telenor_Smart": "Smart", "SmartII": "Smart II", "SmartPlusII": "Smart plus II", "Telenor_Smart_4G": "Smart4G", "TVB-100": "Telkom", "TELMA F1+4G": "F1+4G", "Telma_Titan_4G": "TITAN", "HMB2213PW22TS": "Pik TV Media Box", "hudl ht7s3": "Hudl HT7S3", "Hudl 2": "hudl 2", "TTM813G": "M8.1 3G", "Tesla_SP3_4": "Smartphone 3.4", "Tesla L7.1": "Tablet_L7_1", "Tesla_SP3.3": "Tesla Smartphone 3.3", "Tesla_SP6.3": "Tesla Smartphone 6.3", "Tesla_SP9.1": "Tesla Smartphone 9.1", "Tesla_SP9.1L": "Tesla Smartphone 9.1 Lite", "Tesla L8.1": "Tesla Tablet L8.1", "Friendly_TH101": "Friendly TH101", "PRIMO7": "PRIMO7 Tablet", "PRIMO8": "PRIMO8 Tablet", "PANASONIC TV": "TCL  Percee TV", "SPTEO10BK16": "TEO10", "TLINK455": "TLink 455", "TP1060J": "TIME2", "TP860B": "TIME2", "Infinit_Lite_2": "Infinit Lite 2", "Insignia Delta 2": "Timovi", "Infinit MX": "Timovi Infinit MX", "Infinit_X_CAM": "Timovi Infinit X CAM", "Vision_PRO": "Timovi_Vision_PRO", "AS_501": "AS-501", "Phablet III": "Phablet_III", "TL66": "Antares", "AT10-A": "AT10-A/AT15-A (Japan: AT503)", "AT502": "AT10-A/AT15-A (Japan: AT503)", "AT503": "AT10-A/AT15-A (Japan: AT503)", "AT503_HEMS": "AT10-A/AT15-A (Japan: AT503)", "Tostab03": "AT100", "AT10LE-A": "AT10LE-A/AT15LE-A/AT10PE-A/AT15PE-A  (Japan: AT703)", "AT10PE-A": "AT10LE-A/AT15LE-A/AT10PE-A/AT15PE-A  (Japan: AT703)", "AT702": "AT10LE-A/AT15LE-A/AT10PE-A/AT15PE-A  (Japan: AT703)", "AT703": "AT10LE-A/AT15LE-A/AT10PE-A/AT15PE-A  (Japan: AT703)", "AT300SE": "AT400", "AT374": "AT7-B", "A17": "AT7-C", "AT270": "JP:REGZA Tablet AT570  Others:TOSHIBA AT270", "AT470": "JP:REGZA Tablet AT570  Others:TOSHIBA AT270", "AT570": "JP:REGZA Tablet AT570  Others:TOSHIBA AT270", "AT300": "JPN:REGZA Tablet AT500  Other countries:TOSHIBA AT300", "AT500": "JPN:REGZA Tablet AT500  Other countries:TOSHIBA AT300", "AT500a": "JPN:REGZA Tablet AT500  Other countries:TOSHIBA AT300", "AT330": "JPN:REGZA Tablet AT830 Other countries:TOSHIBA AT330", "AT830": "JPN:REGZA Tablet AT830 Other countries:TOSHIBA AT330", "l4300": "L4300", "l5400": "L5450ME", "l5450": "L5450ME", "l3453": "L5450C", "l5550": "L5550/L5551/L5552", "l9450": "L9450", "TOSPASB": "STB10", "AT1S0": "Thrive 7", "Mozart": "tt300/tt301/tt302", "T700": "T700_TABLET", "TrekStor SurfTab breeze 9.6 quad": "SurfTab breeze 9.6 quad", "TrekStor SurfTab breeze 9.6 quad 3G": "SurfTab breeze 9.6 quad 3G", "st70408_4": "SurfTab xintron i 7.0", "st70408_4_coho": "SurfTab xintron i 7.0", "Trend Echo": "ECHO", "KID_TAB_7_S02": "Retailer Stores", "MobileMapper50_4G": "MM50", "TDC100_4G": "MM50", "MobileMapper50_WiFi": "TDC100_WiFi", "TDC100_WiFi": "MM50", "TD520": "TD-520", "TDC500": "TDC500 Handheld", "TDC800": "TDC800 Handheld", "Rugged Tablet": "TDI 600", "TRIO-7.85": "7.85", "Trio 7.85 vQ": "7.85 vQ", "Trio AXS 3G": "AXS 3G", "Trio MINI": "MINI", "Trio-Stealth-G4-7": "Stealth G4 7", "Trio-Stealth G4 10.1": "Stealth-G4-101", "Trio-Stealth-G4-7.85": "Stealth-G4-7.85", "SMART 4G GEN C 4.0": "SMART 4G GEN C 4.0\"", "SMART 4G GEN C 5.0": "SMART 4G GEN C 5.0\"", "SMART 4G GEN C 5.5": "SMART_4G_GEN_C_5.5", "SMART Champ 4.0": "SMART_Champ_4inch", "StarTrail TT": "Star Trail by TT", "TurboX_Ray": "TurboX", "QOOQ-V41": "QOOQ", "QOOQ-V50": "UNOWHY", "SQOOL-V41": "UNOWHY", "iRULU X11": "IRULU X11", "X9": "IRULU X9", "X7": "Irulu X7", "iRULU_V3": "iRULU V3", "V4": "iRULU_V4", "Armor_2": "Armor 2", "Armor_2S": "Armor 2S", "Armor_X": "Armor X", "MIX_S": "MIX S", "Power_2": "Power 2", "Power_3": "Power 3", "Power_5": "Power 5", "Ulefone S7": "S7", "Ulefone S8": "S8_", "visionbook P55 LTE": "UMAX", "VisionBook_P50Plus_LTE": "VisionBook P50 Plus LTE", "VB_10Q_Plus": "VisionBook10Q", "VisionBook P55 LTE Pro": "VisionBook_P55_LTE_Pro", "S2_PRO": "S2PRO", "UMIX LITE L": "Lite L", "UMIX LITE M": "Lite M", "UMIX LITE XL": "Lite XL", "UMIX VINCI M": "Vinci M", "UH0342": "UH0342  UHTABLET10.1INCH", "V7 Zyro": "Zyro", "JCI VA-10J": "VA-10J", "SmartTV": "MB300", "V5_Plus": "V5Plus", "V5_Plus_Lite": "V5Plus Lite", "QTAIR7": "Ellipsis 10", "QMV7A": "Ellipsis 7 (QMV7A)", "QMV7B": "Ellipsis 7 (QMV7B)", "QTAQZ3": "Ellipsis 8", "QTASUN1": "Ellipsis 8 HD", "QTASUN2": "Gizmo Tab", "QTAXIA1": "Ellipsis ® 10 HD", "vernee_M5": "M5", "M2": "MIX 2", "Impress_Calypso": "Calypso", "Impress_Action": "Impress Action", "IMPRESS CLICK": "Impress Click (3G)", "Impress_Cube": "Impress Cube", "Impress_Dune": "Impress Dune", "Impress_Eagle": "Impress Eagle", "IMPRESS ECLIPSE": "Impress Eclipse (4G)", "Impress_Fire": "Impress Fire", "Impress_Fortune": "Impress Fortune", "Impress_Grip": "Impress Grip", "Impress_Groove": "Impress Groove", "Impress_Lightning": "Impress Lightning", "Impress_Lion_3G": "Impress Lion (3G)", "Impress_Lion_4G": "Impress Lion (4G)", "Impress_Lotus": "Impress Lotus", "Impress_Luck": "Impress Luck", "Impress_Phonic": "Impress Phonic", "Impress_Play": "Impress Play (4G)", "Impress_Ra": "Impress Ra (4G)", "Impress_Razor": "Impress Razor", "Impress_Saturn": "Impress Saturn", "Impress_Spring": "Impress Spring (4G)", "Sun": "Impress Sun", "Tiger": "Impress Tiger", "Impress_Tor": "Impress Tor", "Impress_Vega": "Impress Vega (4G)", "Impress Disco": "Impress_Disco", "G1701": "S1", "Tab 4G 10-1": "Tab_4G_10_1", "Tab 4G 8-1": "Tab_4G_8-1", "Tab_3G_7-1": "Vertex Tab 3G 7-1", "Tab 3G 7-2": "Vertex Tab 3G 7-2", "CONSTELLATION X": "Constellation X", "Signature Touch L": "Signature Touch", "VERTU Ti": "Ti", "verykoolSL5029": "SL5029", "verykoolSL5050": "SL5050", "verykoolSL5200": "SL5200", "verykoolSL5560": "SL5560", "verykoolT7445": "T7445", "verykool Luna II S4513": "s4513", "verykoolS5007": "s5007", "verykool Wave Pro s5021": "s5021", "verykoolS5021": "s5021", "verykoolS5027": "s5027", "verykoolS5028": "s5028", "verykools5034": "s5034", "verykools5035": "s5035", "verykools5204": "s5204", "verykools5526": "s5526", "verykools5527": "s5527", "verykools5528": "s5528", "verykools5036": "verykool s5036", "verykools5037": "verykool s5037", "s6005X": "verykool s6005x", "verykools6005X": "verykool s6005x", "verykools5019": "verykoolS5019", "Vestel_5000": "5000", "Vestel_5000_Dual": "5000", "Vestel_5530": "5530", "Vestel_5530_Dual": "5530", "Vestel_5000_2gb": "Leo_2GB", "VTAB7LITEII": "V TAB 7\" LITE II", "V_TAB_7_LITE_II": "V TAB 7\\'\\' LITE II", "V_TAB_7011": "V TAB 7011", "V_TAB_7015": "V TAB 7015", "V_TAB_7020": "V TAB 7020", "V_TAB_7020A": "V TAB 7020A", "V_TAB_7020B": "V TAB 7020B", "V_TAB_7025": "V TAB 7025", "V_TAB_7810": "V TAB 7810", "V_TAB_8010": "V TAB 8010", "VT97PRO": "V TAB 9.7\\'\\' PRO", "V3_5580_Dual": "V3 5580 Dual", "10.1Myros": "VP100+", "VP73_Hyundai": "VP73", "VP73_Myros": "VP73", "VP73_Vox": "VP73", "VP73_le": "VP73", "VP74-Celcus": "VP74", "VP74-Finlux": "VP74", "VP74-Luxor": "VP74", "VP74-Orava": "VP74", "VP74-Telefunken": "VP74", "VP74-Vox": "VP74", "S TAB 10\\'\\' II": "VT10E2", "V TAB 10\\'\\' LITE": "VT10E2", "V TAB 7.85\\'\\' LITE": "VT785P2", "VT785P2-Celcus": "VT785P2", "VT785P2-Cleverpad": "VT785P2", "VT785P2-Finlux": "VT785P2", "VT785P2-Vestel": "VT785P2", "V_TAB_1040": "VTAB 1040", "V_TAB_7040": "VTAB 7040", "V_TAB_8059": "VTAB 8059", "V_TAB_1049": "VTAB1049", "V_TAB_1050": "VTAB1050", "V_TAB_1069": "VTAB1069", "Venus GO": "Venus Go", "Venus_V3_5020": "Venus V3 5020", "Venus_V3_5030": "Venus V3 5030", "Venus_V3_5040": "Venus V3 5040", "Venus_V3_5040_2GB": "Venus V3 5040", "Venus_V3_5070": "Venus V3 5070", "Venus_V3_5570": "Venus V3 5570", "Venus_V3_5580": "Venus V3 5580", "Venus Z20": "Vestel Z20", "Venus_V3_5010": "venus_v3_5010", "Ocean 6": "OCEAN 6", "Ocean_8": "Ocean 8", "Ocean_9": "Ocean 9", "Venture V12": "VENTURE V12", "i_Smart": "i Smart", "VIDA_i512": "VIDA - i512", "Viewphone Q5": "Q5", "VIEWPAD_AW7M_PLUS": "VIEWSONIC", "VSD241": "VSD241 Smart Display", "VIEWPAD I7M": "ViewPad I7M", "IR7Q": "ViewPad IR7Q", "vsi7q_1": "ViewPadi7Q", "vsi7q_1_coho": "ViewPadi7Q", "vsi8q_1": "ViewPadi8Q", "vsi8q_1_coho": "ViewPadi8Q", "Vision Touch Inspire": "Inspire", "VisionTouchLife": "Life", "Elite10QI": "Prestige Elite10QI", "Elite10QL": "Prestige Elite10QL", "Elite10QS": "Prestige Elite10QS", "Elite11Q": "Prestige Elite11Q", "Elite13Q": "Prestige Elite13Q", "Elite7QL": "Prestige Elite7QL", "Elite7QS": "Prestige Elite7QS", "Elite8QI": "Prestige Elite8QI", "Elite8QL": "Prestige Elite8QL", "Elite9QL": "Prestige Elite9QL", "Prime10ES": "Prestige Prime10ES", "Prime10SE": "Prestige Prime10SE", "Prime11E": "Prestige Prime11E", "Zero_Spin": "Zero Spin", "SMART_EV5": "SMART EV5", "FUN_S20": "FUN S20", "vivo 1601": "1601", "vivo 1713": "1601", "vivo 1609": "1609", "vivo Y13iL": "PD1304DL", "vivo Y923": "PD1419V", "vivo PD1612": "PD1612", "vivo Y67": "Y67", "vivo V1": "V1", "vivo Y37": "V1Max", "vivo V3": "V3", "vivo V3Lite": "V3Lite", "vivo PD1524B": "V3M A", "vivo V3Max": "V3Max", "vivo V3Max+ A": "V3Max + A", "vivo PD1523A": "V3Max A", "vivo V5Plus": "V5Plus", "vivo 1727": "V9", "vivo 1723": "V9 6GB", "vivo X5": "X5", "vivo X5M": "X5M", "vivo X5Max": "X5Max", "vivo X5Max S": "X5Max S", "vivo X5MaxV": "X5MaxV", "vivo X5Pro": "X5Pro", "vivo X5Pro D": "X5Pro D", "vivo X5Pro V": "X5Pro V", "vivo PD1415A": "X6A", "vivo X6D": "X6D", "vivo PD1515A": "X6Plus A", "vivo PD1501D": "X6Plus D", "vivo X6S A": "X6S A", "vivo PD1515BA": "X6SPlusA", "vivo X7": "X7", "vivo X7Plus": "X7Plus", "vivo X9": "X9", "vivo X9i": "X9i", "vivo PD1522A": "Xplay5A", "vivo Xplay5A": "Xplay5A", "vivo Xplay6": "Xplay6", "vivo Y11": "Y11", "vivo Y15": "Y15", "vivo Y15S": "Y15S", "vivo Y21": "Y21", "vivo Y21L": "Y21L", "vivo Y22": "Y22", "vivo Y27": "Y27", "vivo Y28": "Y28", "vivo Y31": "Y31i", "vivo Y31L": "Y31L", "vivo 1707": "Y31i", "vivo Y31i": "Y31i", "vivo Y33": "Y33", "vivo Y35": "Y35", "vivo Y35A": "Y35A", "vivo Y51": "Y51", "vivo Y51A": "Y51A", "vivo 1606": "Y53", "vivo PD1628": "Y53L", "vivo 1603": "Y55", "vivo Y55": "Y55A", "vivo 1610": "Y55s", "vivo Y66": "Y66", "vivo 1801": "Y71", "vivo PD1708": "Y79A", "vivo Y79A": "Y79A", "vivo Y937": "Y937", "vivo Z1": "Z1", "vivo X21i A": "vivo  X21i  A", "vivo Y75s": "vivo  Y75s", "vivo Y85A": "vivo  Y85A", "vivo PD1709": "vivo X20", "vivo X20A": "vivo X20", "vivo PD1710": "vivo X20Plus", "vivo X20Plus A": "vivo X20Plus", "vivo PD1721": "vivo X20Plus UD", "vivo PD1616B": "vivo X9s", "vivo PD1635": "vivo X9s Plus", "vivo 1719": "vivo Y65", "vivo Y89": "vivo Z1i", "VAP430": "StreamPlayer", "Vodafone 785": "785", "VF-895N": "895", "Vodafone Smart Tab 4": "Smart Tab 4", "VFD 1300": "Smart Tab N8", "VFD 200": "Smart first 7", "VFD 300": "Smart mini 7", "VFD 301": "Smart mini 7 dual", "VFD 900": "Smart platinum 7", "VFD 600": "VDF 600", "VFD 501": "Smart turbo 7", "VFD 502": "Smart turbo 7 dual", "Vodafone Smart ultra 6": "Smart ultra 6", "Maxis VFD700": "Smart ultra 7", "VFD 620": "Smart_N9_Lite", "Vodafone Smart Tab 3G": "Smart_Tab_3G", "Vodafone Smart Tab 4G": "Smart_Tab_4G", "VFD 1400": "Tab Prime 7", "VFD1400": "Tab Prime 7", "VFD 1100": "Tab mini 7", "Vodacom Power Tab 10": "VF-1296", "Vodafone Tab grand 6": "VF-1296", "VFD 100": "Vodacom Kicka VE", "VFD 510": "Vodafone Smart E8", "VFD 511": "Vodafone Smart E8", "VFD 512": "Vodafone Smart E8", "VFD 513": "Vodafone Smart E8", "Vodafone 875": "Vodafone Smart mini", "VFD 310": "Vodafone Smart mini 7 ve", "VFD 311": "Vodafone Smart mini 7 ve dual", "Epic_P7": "Epic P7", "Jax X": "Jax_X_TM", "Jax_S_A7": "Jax_S", "Magnet M1": "Magnet_M1", "Navo_P": "Navo  P", "Navo_QS": "Navo QS", "Pluri_M7": "Pluri M7 A6", "Pluri_Q8": "Pluri Q8 TM", "Pluri G7": "Pluri_G7", "Volt_S_A7": "Volt_S", "Xavy_L8": "Xavy L8 A6", "Xavy_T7": "Xavy T7 A6", "Xylo P": "Xylo  P", "Xylo X": "Xylo_X_TM", "Xylo": "Xylo_Z", "ZUN XO": "ZUN XO A6", "Zun X": "Zun X A6", "Jax_S": "jax_S", "BEAT 8": "Beat 8", "VOTO V2i": "VOTO V2i`", "VOTO V5X": "Voto V5X", "MARS TOUCH": "MARS  Touch", "MARS NOCAM": "MARS Nocam", "MARS NOTE": "MARS Note", "SATURN SELFIE": "SATURN Selfie", "VT0701A08": "Pulse 7", "VT0702A16": "Pulse 7S", "VS4011": "TEMPO S11", "VS5012": "TEMPO S12", "VS5513": "TEMPO S13", "VS5016": "TEMPO S16", "VP5004A": "Tempo 5", "VT1002A16": "Vulcan Rhyme 10A", "VT1003J16": "Vulcan Rhyme 10J", "VT0703C16": "Vulcan Rhyme 7C", "VR5533": "Vulcan VR5533", "VR6031": "Vulcan VR6031", "VR6032": "Vulcan VR6032", "Primo GM3 plus": "Primo GM3+", "Primo H6 Plus": "Primo H6+", "Primo_NX3": "Primo NX3", "Primo_S5": "Primo S5", "Primo_ZX2": "Primo ZX2", "Primo RM3": "Primo_RM3", "Primo S6 Dual": "Primo S6 Dual", "WV8R_N": "WV8R-N", "Air": "WeTek", "WEIMEI_NEON2": "WEIMEI NEON2", "weplus_3": "weplus 3", "BARRY": "Barry", "W_C800S": "C800", "W_C860": "C860", "Dream": "DARKFULL", "X-tremer": "DARKNIGHT", "Ridge 4G-Fever": "FEVER", "W-V600": "Harry2", "Cynus F4": "IGGY", "Golf": "IGGY", "SLIDE2": "PULP FAB", "RAINBOW JAM 4G": "RAINBOW LITE 4G", "RIDGE": "RIDGE\\t\\t", "SUGAR Y7 MAX": "U FEEL FAB", "SUGAR Y8": "U FEEL FAB", "View": "VIEW", "View Max": "W_P200CM", "Wileyfox Spark": "Spark Add-X", "Wileyfox Spark +": "Spark Add-X", "Wileyfox Spark X": "Spark X Add-X", "Wileyfox Storm": "Storm", "Wileyfox Swift": "Swift", "Swift 2 Plus": "Swift2 Add-X", "Swift 2 X": "Swift 2", "Wileyfox Swift 2 Plus": "Swift 2", "Wink_City_S": "City S", "Wink Glory SE": "Glory_SE", "Wink_Share_SE": "Share SE", "Wink World SE": "World SE", "TIGER X4": "Tiger X4", "TIGER_X10": "Tiger_X10", "BP-1001": "WoongjinThinkbig", "Woxter_N70": "Woxter", "X_TIGI_JOY7_Mate": "JOY7_Mate", "X_TIGI_JOY7_TV": "JOY7_TV", "X_TIGI_V18": "V18", "X-TIGI_V21": "V21", "X-TIGI_V3+": "V3+", "Proton_Amber_HD": "PROTON_AMBER_HD", "STI6030": "XL Home Pow", "MiTV": "China", "HM 1AC": "HM 1SC", "HM 1S": "HM 1SC", "HM 1SW": "HM 1SC", "HM NOTE 1LTE": "HM NOTE 1LTETD", "HM NOTE 1LTEW": "HM NOTE 1LTETD", "HM NOTE 1S": "HM NOTE 1S CT", "gucci": "HM NOTE 1S CT", "Redmi Note 2": "HM Note 2", "MI 2S": "MI 2", "MI 4C": "MI 4LTE", "MI 4W": "MI 4LTE", "MI 4LTE": "MI 4LTE-CT", "MI 4S": "MI 4s", "Meri": "MI 5C", "sirius": "MI 8 SE", "Mi MIX 2S": "MIX 2S", "Mi Note 3": "MI Note 3", "MI 6": "MI6", "MiBOX_PRO": "MIBOXPRO", "MI PAD 2": "MIPAD2", "MiTV3S": "MITV3S-55/60", "MiTV4": "MITV3S-55/60", "lithium": "MIX", "Mi MIX 2": "MIX 2", "MI 3": "Mi 3", "Mi-4c": "Mi 4c", "MI 5": "Mi 5", "MI 5s": "Mi 5s", "MI A1": "Mi A1", "MIBOX3": "TELEBEE", "MI NOTE LTE": "Mi Note", "Mi Note 2": "Mi Note2", "Redmi S2": "Redmi  S2", "ido": "Redmi 3", "Redmi 4": "Redmi 4 Pro", "santoni": "Redmi 4X", "Redmi Note 5": "Redmi Note 5 Pro", "Redmi 6 Pro": "Redmi 6Pro", "Redmi Note 4X": "Redmi Note 4", "Redmi Y1": "Redmi Note 5A", "Era 3": "Era3", "Era 2V": "XOLO ERA 2V", "era3x": "XOLO ERA 3X", "iX101T1": "RangerX", "iX101T1-2G": "RangerX", "iX101B1": "XSLATE_D10", "iX101D1": "XSLATE_D10", "iX101D1-FIOS": "XSLATE_D10", "YU5530": "YUNICORN", "YU5010A": "YUPHORIA", "YU5510": "Yureka", "YU5011": "Yunique 2", "AO5510": "Yureka", "YU5510A": "Yureka", "YUREKA": "Yureka", "YU5040": "Yureka Black", "YU5041": "Yureka Black", "YU 6000": "Yureka Note", "M651G_MY": "Altitude 2", "EPIC T": "EPIC_T", "YD201": "YotaPhone2", "YUHO_Y2": "Y2", "YUHO_Y2_PRO": "Y2_PRO", "YUHO_O1_LITE": "YUHO_O1", "ZTE V882": "009Z", "ZTE V886J": "009Z", "ZTE A2015": "A2015", "ZTE A2016": "A2016", "ZTE A2017": "A2017", "ZTE A2017G": "A2017G", "ZTE A2017U": "A2017U", "ZTE A2018": "A2018", "ZTE A880": "A880", "B860H": "ACT", "ZTE W1010": "AXON WATCH", "ZTE Blade V220": "Blade V220", "ZTE B2015": "B2015", "ZTE B2016": "B2016", "ZTE B2017G": "B2017G", "B760H": "B760E", "ZTE B790": "B790", "B860H V1.0": "B860H", "B860H V1.1": "B860H", "ZTE B880": "B880", "ZTE BA510": "BA510", "ZTE BA520": "BA520", "ZTE BA601": "BA601", "ZTE BA602": "BA602", "ZTE BA602T": "BA602T", "ZTE BA603": "BA603", "ZTE BA610C": "BA610C", "ZTE BA610T": "BA610T", "ZTE BA611C": "BA611C", "ZTE BA611T": "BA611T", "ZTE BA910": "BA910", "ZTE BA910T": "BA910T", "ZTE-BLADE": "Blade", "ZTE BLADE A110": "BLADE A110", "ZTE BLADE A112": "BLADE A112", "Blade A310": "BLADE A310", "ZTE BLADE A310": "BLADE A310", "ZTE BLADE A320": "BLADE A320", "ZTE BLADE A506": "BLADE A506", "Blade A510": "BLADE A510", "ZTE BLADE A510": "BLADE A510", "ZTE BLADE A512": "BLADE A512", "ZTE Z10": "Z10", "ZTE BLADE A520": "BLADE A520", "ZTE BLADE A521": "BLADE A521", "ZTE BLADE A601": "Blade A510", "ZTE BLADE A602": "BLADE A602", "ZTE BLADE A610": "Bland A610", "ZTE BLADE A610C": "BLADE A610C", "ZTE BLADE A612": "BLADE A612", "ZTE BLADE A910": "BLADE A910", "ZTE BLADE B112": "BLADE B112", "Skate Pro": "Skate  Pro", "ZTE BLADE III": "BLADE III", "ZTE Blade III": "Blade III", "ZTE BLADE L0510": "BLADE L0510", "ZTE Blade L5 Plus": "Blade L5 Plus", "Blade L110": "BLADE L110", "ZTE BLADE L110": "ZTE BLADE L111", "ZTE BLADE L111": "BLADE L111", "ZTE BLADE L5 PLUS": "BLADE L5 PLUS", "ZTE BLADE L7": "BLADE L7", "ZTE BLADE V0710": "BLADE V0710", "ZTE BLADE V0720": "BLADE V7 LITE", "ZTE BLADE V0730": "BLADE V0730", "ZTE BLADE V0800": "BLADE V0800", "ZTE BLADE V0820": "BLADE V0820", "ZTE BLADE V0850": "BLADE V0850", "ZTE BLADE V7": "BLADE V7", "ZTE BLADE V7 LITE": "BLADE V7 LITE", "ZTE BLADE V7 PLUS": "BLADE V7 PLUS", "ZTE BLADE V8 MINI": "BLADE V8 MINI", "N9560": "BOLTON", "ZTE BV0701": "BV0701", "ZTE V0721": "BV0701", "ZTE BV0710": "BV0710", "ZTE BV0710T": "BV0710T", "ZTE BV0720": "BV0720", "ZTE BV0720T": "BV0720T", "ZTE BV0730": "BV0730", "ZTE BV0800": "BV0800", "ZTE BV0850": "BV0850", "003Z": "Blade", "Android Edition StarTrail": "Blade", "BASE lutea": "Blade", "BLADE_N880": "Blade", "Beeline E400": "Blade", "Kyivstar Spark": "Blade", "MF8604": "Blade", "Movistar Prime": "Blade", "N880": "Blade", "Netphone 701": "Blade", "Optimus San Francisco": "Blade", "Orange San Francisco": "Blade", "Orange Tactile internet 2": "Blade", "RTK V8": "Blade", "San Francisco": "Blade", "V8502": "Blade", "WayteQ Libra": "Blade", "XCD35": "Blade", "ZTE Libra": "Blade", "ZTE V880": "Blade", "ZTE-C N880S": "Blade", "ZTE-LIBRA": "Blade", "ZTE-Libra": "Blade", "ZTE-U V880": "Blade", "a5": "Blade", "ZTE BLADE A210": "Blade A210", "ZTE Blade A210": "Blade A210", "ZTE Blade A315": "Blade A315", "NOS FIVE": "Blade A452", "ZTE Blade A452": "Blade A452", "A460-T": "Blade A460", "ZTE BLADE A460": "Blade A460", "ZTE Blade A460": "Blade A460", "ZTE T610": "Blade A460", "ZTE Blade A462": "Blade A462", "ZTE Blade A465": "Blade A465", "ZTE Blade A470": "Blade A470", "BGH JOY X2": "Blade A475", "ZTE Blade A475": "Blade A475", "ZTE Blade L4 Pro": "Blade A475", "BLADE E01": "Blade A476", "ZTE Blade A476": "Blade A476", "ZTE Blade A511": "Blade A511", "ZTE Blade A515": "Blade A515", "ZTE Blade A570": "Blade A570", "ZTE Blade Apex": "Blade Apex", "ZTE Blade Apex2": "Blade Apex2", "ZTE Blade Apex3": "Blade Apex3", "ZTE Blade C312": "Blade C312", "ZTE Blade C340": "Blade C340", "ZTE T220": "Blade C340", "ZTE V812": "Blade C340", "NOS NOVU": "Blade C370", "ZTE BLADE C370": "Blade C370", "ZTE Blade C370": "Blade C370", "ZTE Blade D6 Lite 3G": "Blade D6 Lite 3G", "ZTE Blade D6 Lite 4G": "Blade D6 Lite 4G", "N9517": "Blade Force", "ZTE Blade G": "Blade G", "ZTE Blade G LTE": "Blade G LTE", "BGH Joy Smart A6": "Blade G Lux", "BGH Joy Smart A6d": "Blade G Lux", "DIGICEL DL800": "Blade G Lux", "MEO Smart A40": "Blade G Lux", "Orange Tado": "Blade G Lux", "ZTE Blade G Lux": "Blade G Lux", "ZTE Kis3 max": "Blade G Lux", "ZTE V830W": "Blade G Lux", "ZTE Blade HN": "Blade HN", "ZTE Blade III Pro": "Blade III Pro", "ZTE Blade L110": "Blade L110", "BGH Joy Smart AXS": "Blade L2", "BGH Joy Smart AXS D": "Blade L2", "MEO Smart A75": "Blade L2", "ZTE Blade L2": "Blade L2", "DIGICEL DL910": "Blade L3", "MEO Smart A80": "Blade L3", "X8607": "Blade L3", "ZTE Blade L3": "Blade L3", "ZTE Blade L3 Apex": "Blade L3 Apex", "ZTE Blade L3 Lite": "Blade L3 Lite", "ZTE Blade L3 Plus": "Blade L3 Plus", "ZTE Blade L315": "Blade L315", "ZTE Blade L370": "Blade L370", "ZTE Blade L5": "Blade L5", "ZTE Blade L6": "Blade L6", "ZTE Blade V6 Lite": "Blade L6", "BGH Joy Smart A7G": "Blade Q Lux", "Beeline Pro": "Blade Q Lux", "UZTE Blade Q Lux": "Blade Q Lux", "ZTE Blade A430": "Blade Q Lux", "ZTE Blade Q Lux": "Blade Q Lux", "ZTE Blade Q Lux 3G": "Blade Q Lux", "ZTE Fit 4G Smart": "Blade Q Lux", "ZTE T311": "Blade Q Lux", "ZTE Blade Q Mini": "Bouygues Telecom Bs 402", "ZTE Blade Q3": "Blade Q3", "ZTE T230": "T221", "LS-5008": "Blade S6", "NOS SLIM": "Blade S6", "ZTE Blade S6 Flex": "Blade S6 Flex", "Blade S6": "Blade S6 Lite", "ZTE T912": "T912", "Vodafone Blade V": "Blade V", "ZTE Blade V": "Blade V", "ZTE Blade V2": "Blade V2", "Turk Telekom TT175": "Blade V580", "ZTE Blade V580": "Blade V580", "BGH Joy V6": "Blade V6", "ZTE Blade V6": "Blade V6", "ZTE T660": "Blade V6", "ZTE T663": "Blade V6", "ZTE Blade V6 Plus": "Blade V6 Plus", "ZTE Blade V770": "Blade V770", "ZTE Blade VEC": "Blade VEC", "ZTE Blade Vec": "Blade Vec", "ZTE Geek 2": "Blade Vec", "ZTE Blade Vec 4G": "Blade Vec 4G", "ZTE Blade Vec Pro": "Blade Vec Pro", "Z983": "Blade X Max", "Z6400C": "Blade X2 Max", "ZTE Blade A610": "Bland A610", "Z986DL": "Bolton", "A4C": "Bouygues Telecom Bs 402", "Amazing A4C": "Bouygues Telecom Bs 402", "ZTE C2016": "C2016", "ZTE C2017": "C2017", "L8301": "C310", "Movitel M8410": "C310", "ZTE Blade C310": "C310", "ZTE C310": "C310", "ZTE C880": "C880", "ZTE C880A": "C880A", "ZTE C880D": "C880D", "ZTE C880S": "C880S", "ZTE C880U": "C880U", "Z831": "Chapel", "Digicel DL2 XL": "DL2 PLUS", "Z815": "Fanfare 2", "ZTE G601U": "G601U", "ZTE G717C": "G717C", "ZTE G718C": "G718C", "ZTE G719C": "G719C", "ZTE G720C": "G720C", "ZTE G720T": "G720T", "ZTE GEEK II 4G": "GEEK II 4G", "ZTE GEEK II Pro": "GEEK II Pro", "ZTE M1001": "GEEK II Pro", "ZTE Geek": "V975", "ZTE Geek 2 LTE": "Geek 2 LTE", "ZTE Geek 2 pro": "Geek 2 pro", "ZTE Grand Era": "Grand Era", "ZTE Grand Memo": "Grand Memo LTE", "ZTE Grand Memo LTE": "Grand Memo LTE", "ZTE Grand S Flex": "Grand S Flex", "ZTE Grand S II": "Grand S II", "ZTE S221": "Grand S II", "ZTE Grand S II LTE": "Grand S II LTE", "Grand X(M)": "Grand X", "ZTE Grand X Classic": "Grand X", "ZTE V970": "V970", "ZTE V970M": "Grand X", "ZTE-U V970M": "Grand X", "tmn smart a18": "Grand X", "Amazing A7": "Grand X 2", "ZTE Grand X 2": "Grand X 2", "ZTE V968": "Grand X 2", "ZTE V969": "V969", "STARADDICT II Plus": "Grand X In", "ZTE Grand X In": "Grand X In", "Z988": "Grand X Max 2", "Blade Super": "Grand X Pro", "KPN Smart 300": "Grand X Pro", "Amazing A6": "Grand X Quad Lite", "V8602": "Grand X Quad Lite", "ZTE Grand X Quad Lite": "Grand X Quad Lite", "ZTE Grand X2": "Grand X Quad Lite", "ZTE Skate 2": "Grand X Quad Lite", "ZTE V967S": "Grand X Quad Lite", "ZTE Grand X2 In": "Grand X2 In", "N9136": "GrayJoy", "AV-ATB100": "I-O DATA", "Z718TL": "Jasper LTE", "ZTE-K813": "K813", "Amazing_P8": "K83", "ZTE K97": "K97", "MEO SMART A16": "Kis 3", "MEO Smart A16": "Kis 3", "MOCHE SMART A16": "Kis 3", "ZTE Kis 3": "Kis 3", "ZTE V811": "V811W", "ZTE Kis Lite": "Kis Lite", "Optimus Zali": "Kis Pro", "ZTE Kis Pro": "Kis Pro", "ZTE Kis Q": "Kis Q", "V883M": "LEO M1", "ZTE LEO M1": "LEO M1", "V972M": "LEO S1", "ZTE LEO S1": "LEO S1", "ZTE LEO S2": "LEO S2", "V765M": "LEO_Q1", "ZTE LEO Q1": "LEO_Q1", "ZTE V765M": "LEO_Q1", "ZTE_CLARO_Q1": "LEO_Q1", "ZTE_LEO_Q1": "LEO_Q1", "mobifone M9001": "LEO_Q1", "ZTE Blade S6 Plus": "LS-5503", "Z863DL": "Lannister", "ZTE M901C": "M901C", "MF97B_ROGERS": "MF97B", "Z798BL": "Majesty Pro LTE", "ZTE N5L": "N5L", "ZTE N5S": "N5S", "ZTE-U N720": "N720", "ZTE_U N720": "N720", "ZTE N795": "N795", "ZTE N798": "N798", "ZTE N798+": "N798+", "ZTE N799D": "N799D", "ZTE N818": "N818", "Warp": "N860", "ZTE N880E": "N880E", "ZTE N880G": "N880G", "ZTE N900": "N900", "ZTE N900D": "N900D", "ZTE N909": "N909", "ZTE N909D": "N909D", "ZTE-N910": "N910", "ZTE N9120": "N9120", "BGH Joy Smart AXS II": "NX521J", "BGH Joy Smart AXS II D": "N918St", "ZTE N918St": "N918St", "ZTE N919": "N919", "ZTE N919D": "N919D", "ZTE N928Dt": "N928Dt", "ZTE_N9511": "N9511", "ZTE N983": "N983", "ZTE N9835": "N9835", "ZTE N986": "N986", "N986+": "N986D", "V5": "NE501J", "ZTE_V5": "NE501J", "NX402": "NX40X", "NX40X": "NX40X_APT", "NX507H": "NX507J", "Avea inTouch 3 Large": "Orange Reyo", "Blade Q Maxi": "Orange Reyo", "ZTE Blade Q Maxi": "Orange Reyo", "ZTE P_C880S": "P_C880S", "ZTE Q101T": "Q101T", "ZTE Q201T": "Q201T", "ZTE Q2S-C": "Q2S-C", "ZTE Q2S-T": "Q2S-T", "ZTE Q301C": "Q301C", "ZTE Q301T": "Q301T", "ZTE Q302C": "Q302C", "ZTE Q5-C": "Q5-C", "ZTE Q5-T": "Q5-T", "ZTE Q501T": "Q501T", "ZTE Q501U": "Q501U", "ZTE Q503U": "Q503U", "ZTE Q505T": "Q505T", "ZTE Q507T": "Q507T", "ZTE Q508U": "Q508U", "Amazing X5": "Q509T", "MTC SMART Run 4G": "Q509T", "ZTE Blade A450": "Q509T", "ZTE Blade V2 Lite": "Q509T", "ZTE Q509T": "Q509T", "ZTE Q519T": "Q519T", "ZTE Q529C": "Q529C", "ZTE Q529E": "Q529E", "ZTE Q529T": "Q529T", "ZTE Q7": "Q7", "ZTE Q7-C": "Q7-C", "ZTE Q701C": "Q701C", "ZTE Q705U": "Q705U", "ZTE Q801C": "Q801C", "ZTE Q801L": "Q801L", "ZTE Q801T": "Q801T", "ZTE Q801U": "Q801U", "ZTE Q802C": "Q802C", "ZTE Q802D": "Q802D", "ZTE Q802T": "Q802T", "ZTE Q805T": "Q805T", "ZTE Q806T": "Q806T", "ZW10": "Quartz", "ZTE R83": "R83", "Carl": "Racer", "MTC 916": "Racer", "MTS-SP100": "Racer", "Movistar Link": "Racer", "RTK D1": "Racer", "TaiWan Mobile T2": "Racer", "V8402": "Racer", "Vip Droid": "Racer", "XCD 28": "Racer", "ZTE X850": "Racer", "ZTE-C N600": "Racer", "ZTE-C N600+": "Racer", "ZTE-LINK": "Racer", "ZTE-RACER": "Racer", "ZTE-U V852": "Racer", "ZTE-U X850": "Racer", "Grand S Lite": "S118", "ZTE S118": "S118", "ZTE S2004": "S2004", "ZTE S2005": "S2005", "ZTE S2007": "S2007", "ZTE S2010": "S2010", "ZTE S2014": "S2014", "ZTE S2015": "S2015", "ZTE-SKATE": "SKATE", "ZTE GEEK II Pro 4G": "STAR", "ZTE S2002": "STAR", "ZTE STAR": "STAR", "ZTE Star 1": "STAR", "Avea inTouch 3": "STARTRAIL 4", "ZTE Blade Q": "STARTRAIL 4", "N818S": "Sapphire 3G", "Z610DL": "Sirius", "ZTE Skate": "Skate", "502ZT": "Spro 2", "MF97B": "Spro 2", "MF97V": "Spro 2", "Spro 2 LTE": "Spro 2", "ZKB2A": "Spro 2", "Z799VL": "Stack", "ZTE Switch X1": "Switch X1", "ZTE V796": "Switch X1", "ZTE T12": "T12", "Blade C341": "T221", "DIGICEL DL755": "T221", "KIS C341": "T221", "ZTE Blade A5": "T221", "ZTE Blade AF5": "T221", "ZTE Blade C341": "T221", "ZTE Blade C342": "T221", "ZTE T221": "T221", "ZTE T28": "T28", "ZTE T28 Prepaid": "T28", "ZTE T325": "T325", "ZTE T520": "T520", "ZTE T60": "T60", "ZTE T617": "T617", "ZTE T620": "T620", "ZTE T630": "T630", "ZTE T760": "T760", "ZTE T790": "T790", "ZTE B792": "T792", "ZTE T792": "T792", "ZTE T80": "T80", "ZTE T81": "T81", "ZTE T82": "T82", "ZTE T83": "T83", "ZTE R84": "T84", "ZTE T84": "T84", "Amazing X1": "T86", "ZTE T86": "T86", "ZTE T88": "T88", "ZTE T911": "T911", "ZTE T920": "T920", "TURKCELL TURBO T50": "TURKCELL T50", "N9131": "Tempo", "ZTE-U N721": "U N721", "MD Smart": "U V760", "Telenor Touch Mini": "U V760", "ZTE-U V760": "U V760", "ZTE-U V856": "U V760", "ZTE-U V857": "U V760", "moii E598": "U V760", "ZTE U5S": "U5S", "ZTE U809": "U809", "ZTE U816": "U816", "ZTE U817": "U817", "ZTE U818": "U818", "ZTE U879": "U879", "ZTE-T U880": "U880", "ZTE U889": "U889", "ZTE U9180": "U9180", "ZTE U968": "U968", "ZTE U969": "U969", "ZTE U9815": "U9815", "ZTE U988S": "U988S", "Z968": "Uhura", "ZTE Grand Memo lite": "V5S", "ZTE V5S": "V5S", "Etisalat Smartphone": "V6500", "ZTE-V6500": "V6500", "ZTE V70": "V70", "ZTE V7073": "V7073", "MT7A": "V72", "ZTE V72": "V72", "myPad P4 Lite": "V72", "ZTE V768": "V768", "ZTE LEO Q2": "V769M", "ZTE V769M": "V769M", "ZTE V779M": "V779M", "ZTE V790": "V790", "ZTE V791": "V791", "ZTE V792C": "V792C", "Amazing A3": "V793", "Cellcom 4G": "V793", "M9000": "V793", "Telcel T20": "V793", "ZTE KIS Flex": "V793", "ZTE V793": "V793", "tmn smart a6": "V793", "BGH Joy Smart A1": "V795", "V795(A3S)": "V795", "ZTE B795": "V795", "ZTE KIS II": "V795", "ZTE KIS II PRO": "V795", "ZTE Kis II": "V795", "ZTE V795": "V795", "VIETTEL V8411": "V797", "ZTE V797": "V797", "Amazing A4": "V807", "Beeline E700": "V807", "Leopard MF900": "V807", "UZTE V807": "V807", "V8501": "V807", "ZTE BLADE C": "V807", "ZTE V807": "V807", "ZTE V889S": "V807", "UZTE V808": "V808", "ZTE V808": "V808", "BGH Joy Smart A2": "V809", "ZTE Blade C2": "V809", "ZTE T809": "V809", "ZTE V809": "V809", "meo smart a12": "V809", "Beeline Smart2": "V811", "ZTE V811C": "V811C", "ZTE V811W": "V811W", "ZTE Blade C2 Plus": "V813W", "ZTE V813W": "V813W", "Amazing A4S": "V815W", "B8405": "V815W", "BGH Joy Smart A5C": "V815W", "BGH Joy Smart A5d": "V815W", "KIS II Max": "V815W", "SMART Start": "V815W", "UZTE GRAND V7": "V815W", "ZTE B815": "V815W", "ZTE B816": "V815W", "ZTE Blade Buzz": "V815W", "ZTE Blade C320": "V815W", "ZTE Blade Q1": "V815W", "ZTE Kis II Max": "V815W", "ZTE Kis II Max Plus": "V815W", "ZTE Kis II Max plus": "V815W", "ZTE Maxx": "V815W", "ZTE T815": "V815W", "ZTE T816": "V815W", "ZTE V815W": "V815W", "ZTE V816W": "V815W", "ZTE V817": "V817", "ZTE Blade 2": "V818", "ZTE V818": "V818", "BGH Joy Smart A3": "V829", "Blade G Pro": "V829", "V8507": "V829", "ZTE Blade G Plus": "V829", "ZTE Blade G Pro": "V829", "ZTE V829": "V829", "Amazing A5S": "V831W", "UZTE Blade Q Pro": "V831W", "ZTE T320": "V831W", "ZTE V831W": "V831W", "ZTE-V856": "V856", "ZTE V879": "V879", "ZTE V880E": "V880E", "ZTE V880G": "V880G", "ZTE Blade L": "V887", "ZTE V887": "V887", "tmn smart a20": "V887", "ZTE V889D": "V889D", "UZTE V889M": "V889M", "ZTE V889M": "V889M", "ZTE V891": "V891", "BASE Tab": "V9", "BLACK 03": "V9", "Beeline M2": "V9", "Light Tab": "V9", "MTC 1055": "V9", "One Pad": "V9", "RTK V9": "V9", "TO101": "V9", "TT101": "V9", "V9C": "V9", "V9c": "V9", "V9e": "V9", "myPad P2": "V9", "ZTE V956": "V956", "ZTE Blade G2": "V965", "ZTE R880H": "V965", "ZTE V880H": "V965", "ZTE V965": "V965", "UZTE V970": "V970", "ZTE V975": "V975", "ZTE V9800": "V9800", "ZTE V9820": "V9820", "ZTE V983": "V983", "UZTE GRAND X Quad": "V987", "ZTE Grand X": "V987", "ZTE V987": "V987", "ZTE V993W": "V993W", "Light Tab 2": "V9A", "ZTE V9A": "V9A", "my Pad P3": "V9A", "myPad P3": "V9A", "myPadP4": "V9S", "Z965": "Vesta", "N9519": "Warp 7", "ZTE-X500": "X500", "X501_USA_RS": "X501_USA_Cricket", "Z828TL": "Z828", "ZTE Z932L": "Z932L", "Z955A": "Z955L", "ZTE-Z990": "Z990", "ZTE-Z990G": "Z990G", "K90U": "ZPAD", "Z855": "ZTE AVID 4", "ZTE BLADE A6 MAX": "ZTE BLADE A0605", "ZTE BLADE B111": "ZTE BLADE L111", "ZTE BLADE V0900": "ZTE BLADE V9", "Z982": "ZTE BLade Zmax", "ZTE V0900": "ZTE Blade V9", "Z852": "ZTE Fanfare 3", "Z851": "ZTE Overture 3", "N9137": "ZTE Tempo X", "Z558VL": "ZTE ZFive C LTE", "ZTE V6700": "ZXY-ZTE_V6700", "Z978": "Zmax 3", "Z719DL": "Zmax One", "Z981": "Zmax Pro", "Blade S": "blade S", "Amazing_P5": "myPad P5", "Z3001S": "sapphire lte", "CCHUB1": "CC5000", "MC18N0": "MC18", "MC33": "MC330K", "MC40N0": "MC40", "TC700H": "Pollux", "TC75": "Pollux", "TC20": "TC20KB", "TC75x": "TC75xDF", "TBDG874": "TBDG874 Tablet", "TBQC1063": "TBQC1063B", "TBQG884": "Zeki TBQG884", "ADMIRE_CURVE_NEO": "ADMIRE CURVE NEO", "ADMIRE NEO+": "ZEN ADMIRE NEO PLUS", "ADMIRE_UNITY": "ZEN ADMIRE UNITY", "ADMIRE_INFINITY": "ZEN_ADMIRE_INFINITY", "CINEMAX_INFINITY": "ZEN_CINEMAX_INFINITY", "ADMIRE_CURVE+": "Zen Admire Curve +", "ADMIRE_DUO": "Zen Admire Duo", "ADMIRE GLORY+": "Zen Admire Glory+", "ADMIRE_SENSE+": "Zen Admire Sense+", "ADMIRE STRONG": "Zen Admire Strong", "ADMIRE SWADESH+": "Zen Admire Swadesh+", "CINEMAX_PRIME": "Zen Cinemax Prime", "M72 Smart": "Zen M72 Smart", "Zettaly Avy ZA-407": "ZA-407", "Zpad X7": "Zpad_X7", "ZUK Z2132": "Lenovo Z2 Plus", "ZUK Z1": "Z1", "ZUK Z2131": "Z2", "ZUK Z2121": "Z2 Pro", "MAGNO-S": "MAGNO", "AKUS": "ZUUM AKUS", "MAGNO PLUS": "ZUUM MAGNO PLUS", "M815": "aoson", "Aquaris_A4.5": "Aquaris A4.5", "Aquaris_M4.5": "Aquaris M4.5", "Aquaris M": "Aquaris M5.5", "Aquaris U Lite": "Aquaris U lite", "Aquaris VS": "Aquaris Vs", "Aquaris VS Plus": "Aquaris Vs Plus", "Aquaris X2 Pro": "Aquaris X2 PRO", "BQ-5516L": "BQ-5516L TWIN", "Edison 3 mini": "Edison_3_mini", "Aquaris M8": "M8", "EboxTV": "EBoxTv", "i-mobile IQ II": "IQ II", "i-mobile Y1": "Y1", "i-mobile i-STYLE 812 4G": "i-STYLE 812 4G", "i-mobile M1703": "i-note WiFi 1.1", "AF51": "Alpha", "SF56": "Speed_Pro_Plus", "SpeedX": "iBRIT SpeedX", "iBall Slide Brace XJ": "iBall", "iBall Slide Dazzle i7": "iBall", "iBall_Slide_Imprint_4G": "iBall Slide Imprint 4G", "iBall_Slide_Nimble_4GF": "iBall Slide Nimble 4GF", "Snap_4G2": "iBall Slide Snap 4G2", "Twinkle_i5": "iBall Slide Twinkle i5", "iBall_Slide_Wings_4GP": "iBall Slide Wings 4GP", "Wings": "iBallSlide_Wings", "ICRAIG_CLP288": "CLP288", "ICRAIG_CLP291": "CLP_291", "ICRAIG_CMP770": "CMP770", "ICRAIG_CMP771": "CMP_771", "ICRAIG_CMP773": "CMP_773", "iLA_Silk": "iLA Silk", "iNO S9": "S9", "FrogOne": "Frog One", "DDA800R": "DMT580D", "MIT700": "DMT580D", "MM-3201": "MM3202", "MM-3202": "MM3202", "I-K1": "ULALA", "ITQ1000": "WOW Tab+(ITQ1000)", "ITQ701": "Wow TAB +", "ITQ700": "Wow(Window of the world)", "YBMK01": "Wow(Window of the world)", "G36": "iRULU_G36", "iV 505": "Me 1", "i2_Lite": "i2 Lite", "M9601": "Mytel M9601", "SENCOR_7Q105": "7Q105", "QPI-1": "QPOINT", "TM-5571": "Texet TM-5571", "TM-5581": "Texet TM-5581", "Flix TV Box": "Flix  TV  Box", "Omnis One": "OmnisOne", "V503630": "Delite 11", "V505024": "Krypton 22+", "V505820": "Metal Pro 1", "V505920": "Metal Pro 2", "V406018": "Starr 100", "XBot_Senior": "XBOT_SENIOR", "XTouch X": "XTOUCH X"};
if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = window.countlyDeviceList;
};/*global CountlyHelpers, countlyDeviceList, jQuery */
(function() {
    /** Function gets full device name
    * @param {string} shortName  - short device name
    * @returns{string} full device name
    */
    function getDeviceFullName(shortName) {
        if (shortName === "Unknown") {
            return jQuery.i18n.map["common.unknown"];
        }
        if (countlyDeviceList && countlyDeviceList[shortName]) {
            return countlyDeviceList[shortName];
        }
        return shortName;
    }

    window.countlyDevice = window.countlyDevice || {};
    window.countlyDevice.getDeviceFullName = getDeviceFullName;
    CountlyHelpers.createMetricModel(window.countlyDevice, {name: "devices", estOverrideMetric: "devices"}, jQuery, getDeviceFullName);
}());;/*global CountlyHelpers, countlyDeviceDetails, countlyAppVersion, countlyCommon, _, jQuery*/
(function() {

    window.countlyDeviceDetails = window.countlyDeviceDetails || {};
    CountlyHelpers.createMetricModel(window.countlyDeviceDetails, {name: "device_details", estOverrideMetric: "platforms"}, jQuery);

    countlyDeviceDetails.os_mapping = {
        "unknown": {short: "unk", name: "Unknown"},
        "undefined": {short: "unk", name: "Unknown"},
        "tvos": {short: "atv", name: "Apple TV"},
        "watchos": {short: "wos", name: "Apple Watch"},
        "unity editor": {short: "uty", name: "Unknown"},
        "qnx": {short: "qnx", name: "QNX"},
        "os/2": {short: "os2", name: "OS/2"},
        "windows": {short: "mw", name: "Windows"},
        "open bsd": {short: "ob", name: "Open BSD"},
        "searchbot": {short: "sb", name: "SearchBot"},
        "sun os": {short: "so", name: "Sun OS"},
        "beos": {short: "bo", name: "BeOS"},
        "mac osx": {short: "o", name: "Mac"},
        "macos": {short: "o", name: "Mac"},
        "mac": {short: "o", name: "Mac"},
        "osx": {short: "o", name: "Mac"},
        "linux": {short: "l", name: "Linux"},
        "unix": {short: "u", name: "UNIX"},
        "ios": {short: "i", name: "iOS"},
        "android": {short: "a", name: "Android"},
        "blackberry": {short: "b", name: "BlackBerry"},
        "windows phone": {short: "w", name: "Windows Phone"},
        "wp": {short: "w", name: "Windows Phone"},
        "roku": {short: "r", name: "Roku"},
        "symbian": {short: "s", name: "Symbian"},
        "chrome": {short: "c", name: "Chrome OS"},
        "debian": {short: "d", name: "Debian"},
        "nokia": {short: "n", name: "Nokia"},
        "firefox": {short: "f", name: "Firefox OS"},
        "tizen": {short: "t", name: "Tizen"}
    };

    countlyDeviceDetails.getCleanVersion = function(version) {
        for (var i in countlyDeviceDetails.os_mapping) {
            version = version.replace(new RegExp("^" + countlyDeviceDetails.os_mapping[i].short, "g"), "");
        }
        return version;
    };

    countlyDeviceDetails.callback = function(isRefresh, data) {
        if (isRefresh) {
            countlyAppVersion.refresh(data);
        }
        else {
            countlyAppVersion.initialize();
        }
    };

    countlyDeviceDetails.getPlatforms = function() {
        return countlyDeviceDetails.getMeta("os");
    };

    countlyDeviceDetails.checkOS = function(os, data, osName) {
        return new RegExp("^" + osName + "([0-9]+|unknown)").test(data);
    };

    countlyDeviceDetails.getPlatformData = function() {

        var chartData = countlyCommon.extractTwoLevelData(countlyDeviceDetails.getDb(), countlyDeviceDetails.getMeta("os"), countlyDeviceDetails.clearObject, [
            {
                name: "os_",
                func: function(rangeArr) {
                    if (countlyDeviceDetails.os_mapping[rangeArr.toLowerCase()]) {
                        return countlyDeviceDetails.os_mapping[rangeArr.toLowerCase()].name;
                    }
                    return rangeArr;
                }
            },
            {
                name: "origos_",
                func: function(rangeArr) {
                    return rangeArr;
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "platforms");
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "os_");
        var platformNames = _.pluck(chartData.chartData, 'os_'),
            platformTotal = _.pluck(chartData.chartData, 'u'),
            chartData2 = [];

        /*var sum = _.reduce(platformTotal, function(memo, num) {
            return memo + num;
        }, 0);*/

        for (var i = 0; i < platformNames.length; i++) {
            chartData2[i] = {
                data: [
                    [0, platformTotal[i]]
                ],
                label: platformNames[i]
            };
        }

        chartData.chartDP = {};
        chartData.chartDP.dp = chartData2;

        return chartData;
    };

    countlyDeviceDetails.getResolutionData = function() {
        var chartData = countlyCommon.extractTwoLevelData(countlyDeviceDetails.getDb(), countlyDeviceDetails.getMeta("resolutions"), countlyDeviceDetails.clearObject, [
            {
                name: "resolution",
                func: function(rangeArr) {
                    return rangeArr;
                }
            },
            {
                name: "width",
                func: function(rangeArr) {
                    return "<a>" + rangeArr.split("x")[0] + "</a>";
                }
            },
            {
                name: "height",
                func: function(rangeArr) {
                    return "<a>" + rangeArr.split("x")[1] + "</a>";
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "resolutions");

        var resolutions = _.pluck(chartData.chartData, 'resolution'),
            resolutionTotal = _.pluck(chartData.chartData, 'u'),
            resolutionNew = _.pluck(chartData.chartData, 'n'),
            chartData2 = [],
            chartData3 = [];

        /*var sum = _.reduce(resolutionTotal, function(memo, num) {
            return memo + num;
        }, 0);*/
        var i = 0;
        for (i = 0; i < resolutions.length; i++) {
            //var percent = (resolutionTotal[i] / sum) * 100;
            chartData2[i] = {
                data: [
                    [0, resolutionTotal[i]]
                ],
                label: resolutions[i]
            };
        }

        /*var sum2 = _.reduce(resolutionNew, function(memo, num) {
            return memo + num;
        }, 0);*/

        for (i = 0; i < resolutions.length; i++) {
            //var percent = (resolutionNew[i] / sum) * 100;
            chartData3[i] = {
                data: [
                    [0, resolutionNew[i]]
                ],
                label: resolutions[i]
            };
        }

        chartData.chartDPTotal = {};
        chartData.chartDPTotal.dp = chartData2;

        chartData.chartDPNew = {};
        chartData.chartDPNew.dp = chartData3;

        return chartData;
    };

    countlyDeviceDetails.__getBars = countlyDeviceDetails.getBars;
    countlyDeviceDetails.getBars = function(metric) {
        var data = countlyDeviceDetails.__getBars(metric);

        if (metric === "os_versions") {
            for (var i = 0; i < data.length; i++) {
                data[i].name = countlyDeviceDetails.fixOSVersion(data[i].name);
            }
        }

        return data;
    };

    countlyDeviceDetails.fixOSVersion = function(osName) {
        osName = (osName + "").replace(/:/g, ".");

        for (var i in countlyDeviceDetails.os_mapping) {
            osName = osName.replace(new RegExp("^" + countlyDeviceDetails.os_mapping[i].short, "g"), countlyDeviceDetails.os_mapping[i].name + " ");
        }
        return osName;
    };
}());;/*global CountlyHelpers, jQuery, countlyAppVersion, countlyDeviceDetails*/
(function() {
    window.countlyAppVersion = window.countlyAppVersion || {};
    CountlyHelpers.createMetricModel(window.countlyAppVersion, {name: "app_versions", estOverrideMetric: "app_versions"}, jQuery, function(rangeArr) {
        return rangeArr.replace(/:/g, ".");
    });

    //Public Methods
    countlyAppVersion.initialize = function() {
        countlyAppVersion.setDb(countlyDeviceDetails.getDb());
    };

    countlyAppVersion.refresh = function(newJSON) {
        if (newJSON) {
            countlyAppVersion.extendDb(newJSON);
        }
    };
}(window.countlyAppVersion = window.countlyAppVersion || {}, jQuery));;/*global CountlyHelpers, jQuery*/
(function() {
    var _carrierCodeMap = {"46000": "中国移动(GSM)", "46001": "中国联通(GSM)", "46002": "中国移动(TD-S)", "46003": "中国电信(CDMA)", "46005": "中国电信(CDMA)", "46006": "中国联通(WCDMA)", "46007": "中国移动(TD-S)", "46011": "中国电信(FDD-LTE)", "460 11": "中国电信(FDD-LTE)"};
    /** function returns carrier code name
    * @param {string} code - carrier code
    * @returns {string} carrier name
    */
    function getCarrierCodeName(code) {
        return _carrierCodeMap[code] ? _carrierCodeMap[code] : code;
    }

    window.countlyCarrier = window.countlyCarrier || {};
    window.countlyCarrier.getCarrierCodeName = getCarrierCodeName;
    CountlyHelpers.createMetricModel(window.countlyCarrier, {name: "carriers", estOverrideMetric: "carriers"}, jQuery, getCarrierCodeName);
}());;/* global countlyCommon, countlyGlobal, countlyDevice, _, jQuery */
(function(countlyTotalUsers, $) {

    //Private Properties
    var _activeAppId = 0,
        _initialized = {},
        _period = null,
        _totalUserObjects = {};

    //Public Methods
    countlyTotalUsers.initialize = function(forMetric) {
        _period = countlyCommon.getPeriodForAjax();
        _activeAppId = countlyCommon.ACTIVE_APP_ID;

        if (!countlyTotalUsers.isUsable()) {
            return true;
        }

        if (isInitialized(forMetric)) {
            return countlyTotalUsers.refresh(forMetric);
        }

        setInit(forMetric);

        /*
            Format of the API request is
            /o?method=total_users & metric=countries & period=X & api_key=Y & app_id=Y
        */
        if (_period === "hour") {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": _activeAppId,
                    "method": "total_users",
                    "metric": forMetric,
                    "period": _period
                },
                dataType: "jsonp",
                success: function(json) {
                    setCalculatedObj(forMetric, json);
                }
            });
        }
        else {
            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id": _activeAppId,
                        "method": "total_users",
                        "metric": forMetric,
                        "period": _period
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        setCalculatedObj(forMetric, json);
                    }
                }),
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "total_users",
                        "metric": forMetric,
                        "period": "hour"
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        setRefreshObj(forMetric, json);
                    }
                })
            ).then(function() {
                return true;
            });
        }
    };

    countlyTotalUsers.refresh = function(forMetric) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "api_key": countlyGlobal.member.api_key,
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "total_users",
                "metric": forMetric,
                "period": "hour",
                "action": "refresh"
            },
            dataType: "jsonp",
            success: function(todaysJson) {
                refreshData(forMetric, todaysJson);
            }
        });
    };

    countlyTotalUsers.get = function(forMetric) {
        if (_totalUserObjects[_activeAppId] && _totalUserObjects[_activeAppId][forMetric]) {
            return _totalUserObjects[_activeAppId][forMetric][_period] || {};
        }
        else {
            return {};
        }
    };

    /*
        Total user override can only be used if selected period contains today
        API returns empty object if requested date doesn't contain today
     */
    countlyTotalUsers.isUsable = function() {
        return countlyCommon.periodObj.periodContainsToday;
    };

    /**Sets init status for forMetric in below format
     * { "APP_KEY": { "countries": { "60days": true } } }
     * We don't directly use _totalUserObjects for init check because it is init after AJAX and might take time
     * @param {string} forMetric   - metric for which set init status
     */
    function setInit(forMetric) {
        if (!_initialized[_activeAppId]) {
            _initialized[_activeAppId] = {};
        }

        if (!_initialized[_activeAppId][forMetric]) {
            _initialized[_activeAppId][forMetric] = {};
        }

        _initialized[_activeAppId][forMetric][_period] = true;
    }

    /** function checks if metric is initialized
     * @param {string} forMetric - metric name to check
     * @returns {boolean} if initialized
     */
    function isInitialized(forMetric) {
        return _initialized[_activeAppId] &&
                _initialized[_activeAppId][forMetric] &&
                _initialized[_activeAppId][forMetric][_period];
    }

    /** Adds data for forMetric to _totalUserObjects object in below format
     *   { "APP_KEY": { "countries": { "60days": {"TR": 1, "UK": 5} } } }
     * @param {string} forMetric - metric name
     * @param {object} data  - data to set
     */
    function setCalculatedObj(forMetric, data) {
        if (!_totalUserObjects[_activeAppId]) {
            _totalUserObjects[_activeAppId] = {};
        }

        if (!_totalUserObjects[_activeAppId][forMetric]) {
            _totalUserObjects[_activeAppId][forMetric] = {};
        }

        _totalUserObjects[_activeAppId][forMetric][_period] = formatCalculatedObj(data, forMetric);
    }

    /** sets refresh  obj for metric
     *   { "APP_KEY": { "countries": { "60days": {"TR": 1, "UK": 5} } } }
     * @param {string} forMetric - metric name
     * @param {object} data  - data to set
     */
    function setRefreshObj(forMetric, data) {
        if (!_totalUserObjects[_activeAppId]) {
            _totalUserObjects[_activeAppId] = {};
        }

        if (!_totalUserObjects[_activeAppId][forMetric]) {
            _totalUserObjects[_activeAppId][forMetric] = {};
        }

        _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"] = formatCalculatedObj(data, forMetric);
    }

    /** Response from the API is in [{"_id":"TR","u":1},{"_id":"UK","u":5}] format
     *  We convert it to {"TR": 1, "UK": 5} format in this function
     *  processingFunction is used for cases where keys are converted before being processed (e.g. device names)
     * @param {object} obj - data object
     * @param {string} forMetric - metric name
     * @returns {object} converted object
     */
    function formatCalculatedObj(obj, forMetric) {
        var tmpObj = {},
            processingFunction;

        switch (forMetric) {
        case "devices":
            processingFunction = countlyDevice.getDeviceFullName;
            break;
        }

        for (var i = 0; i < obj.length; i++) {
            var tmpKey = (processingFunction) ? processingFunction(obj[i]._id) : obj[i]._id;

            tmpObj[tmpKey] = obj[i].u;
        }

        return tmpObj;
    }

    /** Refreshes data based the diff between current "refresh" and the new one retrieved from the API
     *  { "APP_KEY": { "countries": { "30days_refresh": {"TR": 1, "UK": 5} } } }
     * @param {string} forMetric - metric name
     * @param {object} todaysJson - data
     */
    function refreshData(forMetric, todaysJson) {
        if (_totalUserObjects[_activeAppId] &&
            _totalUserObjects[_activeAppId][forMetric] &&
            _totalUserObjects[_activeAppId][forMetric][_period] &&
            _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"]) {

            var currObj = _totalUserObjects[_activeAppId][forMetric][_period],
                currRefreshObj = _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"],
                newRefreshObj = formatCalculatedObj(todaysJson, forMetric);

            _.each(newRefreshObj, function(value, key) {
                if (currRefreshObj[key]) {
                    // If existing refresh object contains the key we refresh the value
                    // in total user object to curr value + new refresh value - curr refresh value
                    currObj[key] += value - currRefreshObj[key];
                }
                else {
                    // Total user object doesn't have this key so we just add it
                    currObj[key] = value;
                }
            });

            // Both total user obj and refresh object is changed, update our var
            _totalUserObjects[_activeAppId][forMetric][_period] = currObj;
            _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"] = newRefreshObj;
        }
    }

    // Triggered when app data is cleared
    $(document).on("/i/apps/reset", function(event, args) {
        delete _totalUserObjects[args.app_id];
        delete _initialized[args.app_id];
    });

    // Triggered when app is deleted
    $(document).on("/i/apps/delete", function(event, args) {
        delete _totalUserObjects[args.app_id];
        delete _initialized[args.app_id];
    });

}(window.countlyTotalUsers = window.countlyTotalUsers || {}, jQuery));;/* global countlyCommon, countlyGlobal, countlyAssistant, CountlyHelpers, store, app, jQuery*/
(function(countlyTaskManager, $) {

    //Private Properties
    var _resultData = [],
        _resultObj = {},
        _data = {},
        curTask = 0;

    //Public Methods
    countlyTaskManager.initialize = function(isRefresh, query) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/tasks/all",
            data: {
                "api_key": countlyGlobal.member.api_key,
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": JSON.stringify(query || {}),
                "period": countlyCommon.getPeriodForAjax(),
                "display_loader": !isRefresh
            },
            dataType: "json",
            success: function(json) {
                _resultData = json;
                for (var i = 0; i < json.length; i++) {
                    if (json[i].meta) {
                        json[i].meta = countlyCommon.decodeHtml(json[i].meta);
                    }
                    if (json[i].request) {
                        json[i].request = JSON.parse(countlyCommon.decodeHtml(json[i].request));
                    }
                    _resultObj[json[i]._id] = json[i];
                }
            }
        });
    };

    countlyTaskManager.fetchResult = function(id, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/tasks/task",
            data: {
                "api_key": countlyGlobal.member.api_key,
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "task_id": id,
                "display_loader": false
            },
            dataType: "json",
            success: function(json) {
                if (json.data) {
                    json.data = JSON.parse(countlyCommon.decodeHtml(json.data));
                }
                if (json.meta) {
                    json.meta = countlyCommon.decodeHtml(json.meta);
                }
                if (json.request) {
                    json.request = JSON.parse(countlyCommon.decodeHtml(json.request));
                }
                _data[id] = json;
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyTaskManager.getResult = function(id) {
        return _data[id];
    };

    countlyTaskManager.getTask = function(id) {
        return _resultObj[id];
    };

    countlyTaskManager.common = function(id, path, callback) {
        var data = {};
        if (typeof id === "string") {
            data.task_id = id;
        }
        else {
            data = id || {};
        }
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.api_key = countlyGlobal.member.api_key;
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/tasks/' + path,
            data: data,
            dataType: "json",
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyTaskManager.del = function(id, callback) {
        countlyTaskManager.common(id, "delete", callback);
    };

    countlyTaskManager.update = function(id, callback) {
        countlyTaskManager.common(id, "update", callback);
    };

    countlyTaskManager.name = function(id, name, callback) {
        countlyTaskManager.common({id: id, name: name}, "name", callback);
    };

    countlyTaskManager.check = function(id, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/tasks/check',
            data: {
                task_id: id,
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key: countlyGlobal.member.api_key
            },
            dataType: "json",
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyTaskManager.reset = function() {
        _resultData = [];
        _resultObj = {};
        _data = {};
        curTask = 0;
    };

    countlyTaskManager.getResults = function() {
        return _resultData;
    };

    countlyTaskManager.makeTaskNotification = function(title, message, info, data, notifSubType, i18nId, notificationVersion) {
        var contentData = data;
        var ownerName = "ReportManager";
        var notifType = 4;//informational notification, check assistant.js for additional types

        countlyAssistant.createNotification(contentData, ownerName, notifType, notifSubType, i18nId, countlyCommon.ACTIVE_APP_ID, notificationVersion, countlyGlobal.member.api_key, function(res) {
            if (!res) {
                CountlyHelpers.notify({
                    title: title,
                    message: message,
                    info: info
                });
            }
        });
    };

    countlyTaskManager.monitor = function(id, silent) {
        var monitor = store.get("countly_task_monitor") || {};
        if (!monitor[countlyCommon.ACTIVE_APP_ID]) {
            monitor[countlyCommon.ACTIVE_APP_ID] = [];
        }
        if (monitor[countlyCommon.ACTIVE_APP_ID].indexOf(id) === -1) {
            monitor[countlyCommon.ACTIVE_APP_ID].push(id);
            store.set("countly_task_monitor", monitor);
            if (!silent) {
                CountlyHelpers.notify({
                    title: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.title"],
                    message: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.message"],
                    info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"]
                });
            }
        }
        else {
            if (!silent) {
                CountlyHelpers.notify({
                    title: jQuery.i18n.map["assistant.taskmanager.longTaskAlreadyRunning.title"],
                    message: jQuery.i18n.map["assistant.taskmanager.longTaskAlreadyRunning.message"],
                    info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"]
                });
            }
        }
    };

    countlyTaskManager.tick = function() {
        var assistantAvailable = true;
        if (typeof countlyAssistant === "undefined") {
            assistantAvailable = false;
        }
        var monitor = store.get("countly_task_monitor") || {};
        if (monitor[countlyCommon.ACTIVE_APP_ID] && monitor[countlyCommon.ACTIVE_APP_ID][curTask]) {
            var id = monitor[countlyCommon.ACTIVE_APP_ID][curTask];
            countlyTaskManager.check(id, function(res) {
                if (res === false || res.result === "completed" || res.result === "errored") {
                    //get it from storage again, in case it has changed
                    monitor = store.get("countly_task_monitor") || {};
                    //get index of task, cause it might have been changed
                    var index = monitor[countlyCommon.ACTIVE_APP_ID].indexOf(id);
                    //remove item
                    if (index !== -1) {
                        monitor[countlyCommon.ACTIVE_APP_ID].splice(index, 1);
                        store.set("countly_task_monitor", monitor);
                    }

                    //notify task completed
                    if (res && res.result === "completed") {
                        countlyTaskManager.fetchResult(id, function(res1) {
                            if (res1 && res1.view) {
                                if (!assistantAvailable) {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["assistant.taskmanager.completed.title"],
                                        message: jQuery.i18n.map["assistant.taskmanager.completed.message"],
                                        info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"],
                                        sticky: true,
                                        onClick: function() {
                                            app.navigate(res1.view + id, true);
                                        }
                                    });
                                }
                                else {
                                    countlyTaskManager.makeTaskNotification(jQuery.i18n.map["assistant.taskmanager.completed.title"], jQuery.i18n.map["assistant.taskmanager.completed.message"], jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"], [res1.view + id, res1.name || ""], 3, "assistant.taskmanager.completed", 1);
                                }
                            }
                        });
                    }
                    else if (res && res.result === "errored") {
                        if (!assistantAvailable) {
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["assistant.taskmanager.errored.title"],
                                message: jQuery.i18n.map["assistant.taskmanager.errored.message"],
                                info: jQuery.i18n.map["assistant.taskmanager.errored.info"],
                                type: "error",
                                sticky: true,
                                onClick: function() {
                                    app.navigate("#/manage/tasks", true);
                                }
                            });
                        }
                        else {
                            countlyTaskManager.fetchResult(id, function(res1) {
                                countlyTaskManager.makeTaskNotification(jQuery.i18n.map["assistant.taskmanager.errored.title"], jQuery.i18n.map["assistant.taskmanager.errored.message"], jQuery.i18n.map["assistant.taskmanager.errored.info"], [res1.name || ""], 4, "assistant.taskmanager.errored", 1);
                            });
                        }
                    }
                }
                else {
                    curTask++;
                }
                if (curTask >= monitor[countlyCommon.ACTIVE_APP_ID].length) {
                    curTask = 0;
                }
                setTimeout(function() {
                    countlyTaskManager.tick();
                }, countlyCommon.DASHBOARD_REFRESH_MS);
            });
        }
        else {
            setTimeout(function() {
                countlyTaskManager.tick();
            }, countlyCommon.DASHBOARD_REFRESH_MS);
        }
    };

    $(document).ready(function() {
        countlyTaskManager.tick();
        var initial = true;
        //listen for UI app change
        app.addAppSwitchCallback(function() {
            if (initial) {
                initial = false;
            }
            else {
                countlyTaskManager.reset();
            }
        });
    });

}(window.countlyTaskManager = window.countlyTaskManager || {}, jQuery));;/*global countlyCommon, countlyTaskManager, jQuery, $*/
(function(countlyAppUsers) {

    //export data for user based on passed id
    //callback(error, fileid(if exist), taskid(if exist))
    countlyAppUsers.exportUser = function(query, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/export",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": query
            },
            success: function(result) {
                var task_id = null;
                var fileid = null;
                if (result && result.result && result.result.task_id) {
                    task_id = result.result.task_id;
                    countlyTaskManager.monitor(task_id);
                }
                else if (result && result.result) {
                    fileid = result.result;
                }
                callback(null, fileid, task_id);
            },
            error: function(xhr, status, error) {
                var filename = null;
                if (xhr && xhr.responseText && xhr.responseText !== "") {
                    var ob = JSON.parse(xhr.responseText);
                    if (ob.result && ob.result.message) {
                        error = ob.result.message;
                    }
                    if (ob.result && ob.result.filename) {
                        filename = ob.result.filename;
                    }
                }
                callback(error, filename, null);
            }
        });
    };

    //delete specific export data
    //callback(error, fileid(if exist), taskid(if exist))
    countlyAppUsers.deleteExport = function(eid, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/deleteExport/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + eid,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
            },
            success: function(result) {
                callback(null, result);
            },
            error: function(xhr, status, error) {
                callback(error, null);
            }
        });
    };

    //delete all data about specific users
    //callback(error, fileid(if exist), taskid(if exist))
    countlyAppUsers.deleteUserdata = function(query, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/delete",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": query
            },
            success: function(result) {
                callback(null, result);
            },
            error: function(xhr, status, error) {
                callback(error, null);
            }
        });
    };

}(window.countlyAppUsers = window.countlyAppUsers || {}, jQuery));;/* global Backbone, Handlebars, countlyEvent, countlyCommon, countlyGlobal, CountlyHelpers, countlySession, moment, Drop, _, store, countlyLocation, jQuery, $*/
/**
* Default Backbone View template from which all countly views should inherit.
* A countly view is defined as a page corresponding to a url fragment such
* as #/manage/apps. This interface defines common functions or properties
* the view object has. A view may override any function or property.
* @name countlyView
* @global
* @namespace countlyView
* @example <caption>Extending default view and overwriting its methods</caption>
*  window.DashboardView = countlyView.extend({
*       renderCommon:function () {
*           if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID]){
*               var type = countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type;
*               type = jQuery.i18n.map["management-applications.types."+type] || type;
*               $(this.el).html("<div id='no-app-type'><h1>"+jQuery.i18n.map["common.missing-type"]+": "+type+"</h1></div>");
*           }
*           else{
*               $(this.el).html("<div id='no-app-type'><h1>"+jQuery.i18n.map["management-applications.no-app-warning"]+"</h1></div>");
*           }
*       }
*   });
*/
var countlyView = Backbone.View.extend({
    /**
    * Checking state of view, if it is loaded
    * @type {boolean}
    * @instance
    * @memberof countlyView
    */
    isLoaded: false,
    /**
    * Handlebar template
    * @type {object}
    * @instance
    * @memberof countlyView
    */
    template: null, //handlebars template of the view
    /**
    * Data to pass to Handlebar template when building it
    * @type {object}
    * @instance
    * @memberof countlyView
    */
    templateData: {}, //data to be used while rendering the template
    /**
    * Main container which contents to replace by compiled template
    * @type {jquery_object}
    * @instance
    * @memberof countlyView
    */
    el: $('#content'), //jquery element to render view into
    _myRequests: {}, //save requests called for this view
    /**
    * Initialize view, overwrite it with at least empty function if you are using some custom remote template
    * @memberof countlyView
    * @instance
    */
    initialize: function() { //compile view template
        this.template = Handlebars.compile($("#template-analytics-common").html());
    },
    _removeMyRequests: function() {
        for (var url in this._myRequests) {
            for (var data in this._myRequests[url]) {
                //4 means done, less still in progress
                if (parseInt(this._myRequests[url][data].readyState) !== 4) {
                    this._myRequests[url][data].abort();
                }
            }
        }
        this._myRequests = {};
    },
    /**
    * This method is called when date is changed, default behavior is to call refresh method of the view
    * @memberof countlyView
    * @instance
    */
    dateChanged: function() { //called when user changes the date selected
        if (Backbone.history.fragment === "/") {
            this.refresh(true);
        }
        else {
            this.refresh();
        }
    },
    /**
    * This method is called when app is changed, default behavior is to reset preloaded data as events
    * @param {function=} callback  - callback function
    * @memberof countlyView
    * @instance
    */
    appChanged: function(callback) { //called when user changes selected app from the sidebar
        countlyEvent.reset();
        $.when(countlyEvent.initialize()).always(function() {
            if (callback) {
                callback();
            }
        });
    },
    /**
    * This method is called before calling render, load your data and remote template if needed here
    * @returns {boolean} true
    * @memberof countlyView
    * @instance
    * @example
    *beforeRender: function() {
    *    if(this.template)
    *       return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("densities"), countlyDensity.initialize()).then(function () {});
    *   else{
    *       var self = this;
    *       return $.when($.get(countlyGlobal["path"]+'/density/templates/density.html', function(src){
    *           self.template = Handlebars.compile(src);
    *       }), countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("densities"), countlyDensity.initialize()).then(function () {});
    *   }
    *}
    */
    beforeRender: function() {
        return true;
    },
    /**
    * This method is called after calling render method
    * @memberof countlyView
    * @instance
    */
    afterRender: function() { },
    /**
    * Main render method, better not to over write it, but use {@link countlyView.renderCommon} instead
    * @returns {object} this
    * @memberof countlyView
    * @instance
    */
    render: function() { //backbone.js view render function
        var currLink = Backbone.history.fragment;

        // Reset any active views and dropdowns
        $("#main-views-container").find(".main-view").removeClass("active");
        $("#top-bar").find(".dropdown.active").removeClass("active");

        // Activate the main view and dropdown based on the active view
        if (/^\/custom/.test(currLink) === true) {
            $("#dashboards-main-view").addClass("active");
            $("#dashboard-selection").addClass("active");
        }
        else {
            $("#analytics-main-view").addClass("active");
            $("#app-navigation").addClass("active");
        }
        $("#content-top").html("");
        this.el.html('');

        if (countlyCommon.ACTIVE_APP_ID) {
            var self = this;
            $.when(this.beforeRender(), initializeOnce()).always(function() {
                if (app.activeView === self) {
                    self.isLoaded = true;
                    self.renderCommon();
                    self.afterRender();
                    app.pageScript();
                }
            });
        }
        else {
            if (app.activeView === this) {
                this.isLoaded = true;
                this.renderCommon();
                this.afterRender();
                app.pageScript();
            }
        }

        // Top bar dropdowns are hidden by default, fade them in when view render is complete
        $("#top-bar").find(".dropdown").fadeIn(2000);

        return this;
    },
    /**
    * Do all your rendering in this method
    * @param {boolean} isRefresh - render is called from refresh method, so do not need to do initialization
    * @memberof countlyView
    * @instance
    * @example
    *renderCommon:function (isRefresh) {
    *    //set initial data for template
    *    this.templateData = {
    *        "page-title":jQuery.i18n.map["density.title"],
    *        "logo-class":"densities",
    *        "chartHTML": chartHTML,
    *    };
    *
    *    if (!isRefresh) {
    *        //populate template with data and add to html
    *        $(this.el).html(this.template(this.templateData));
    *    }
    *}
    */
    renderCommon: function(/* isRefresh*/) {}, // common render function of the view
    /**
    * Called when view is refreshed, you can reload data here or call {@link countlyView.renderCommon} with parameter true for code reusability
    * @returns {boolean} true
    * @memberof countlyView
    * @instance
    * @example
    * refresh:function () {
    *    var self = this;
    *    //reload data from beforeRender method
    *    $.when(this.beforeRender()).then(function () {
    *        if (app.activeView != self) {
    *            return false;
    *        }
    *        //re render data again
    *        self.renderCommon(true);
    *
    *        //replace some parts manually from templateData
    *        var newPage = $("<div>" + self.template(self.templateData) + "</div>");
    *        $(self.el).find(".widget-content").replaceWith(newPage.find(".widget-content"));
    *        $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
    *        $(self.el).find(".density-widget").replaceWith(newPage.find(".density-widget"));
    *    });
    *}
    */
    refresh: function() { // resfresh function for the view called every 10 seconds by default
        return true;
    },
    /**
    * This method is called when user is active after idle period
    * @memberof countlyView
    * @instance
    */
    restart: function() { // triggered when user is active after idle period
        this.refresh();
    },
    /**
    * This method is called when view is destroyed (user entered inactive state or switched to other view) you can clean up here if there is anything to be cleaned
    * @memberof countlyView
    * @instance
    */
    destroy: function() { }
});

/**
 * View class to expand by plugins which need configuration under Management->Applications.
 */
window.countlyManagementView = countlyView.extend({
    /**
     * Handy function which returns currently saved configuration of this plugin or empty object.
     *
     * @return {Object} app object
     */
    config: function() {
        return countlyGlobal.apps[this.appId] &&
            countlyGlobal.apps[this.appId].plugins &&
            countlyGlobal.apps[this.appId].plugins[this.plugin] || {};
    },

    /**
     * Set current app id
     * @param {string} appId - app Id to set
     */
    setAppId: function(appId) {
        if (appId !== this.appId) {
            this.appId = appId;
            this.resetTemplateData();
            this.savedTemplateData = JSON.stringify(this.templateData);
        }
    },

    /**
     * Reset template data when changing app
     */
    resetTemplateData: function() {
        this.templateData = {};
    },

    /**
     * Title of plugin configuration tab, override with your own title.
     *
     * @return {String} tab title
     */
    titleString: function() {
        return 'Default plugin configuration';
    },

    /**
     * Saving string displayed when request takes more than 0.3 seconds, override if needed.
     *
     * @return {String} saving string
     */
    savingString: function() {
        return 'Saving...';
    },

    /**
     * Callback function called before tab is expanded. Override if needed.
     */
    beforeExpand: function() {},

    /**
     * Callback function called after tab is collapsed. Override if needed.
     */
    afterCollapse: function() {},

    /**
     * Function used to determine whether save button should be visible. Used whenever UI is redrawn or some value changed. Override if needed.
     *
     * @return {Boolean} true if enabled
     */
    isSaveAvailable: function() {
        return JSON.stringify(this.templateData) !== this.savedTemplateData.toString();
    },

    /**
     * Callback function called to apply changes. Override if validation is needed.
     *
     * @return {String} error to display to user if validation didn't pass
     */
    validate: function() {
        return null;
    },

    /**
     * Function which prepares data to the format required by the server, must return a Promise.
     *
     * @return {Promise} which resolves to object of {plugin-name: {config: true, options: true}} format or rejects with error string otherwise
     */
    prepare: function() {
        var o = {}; o[this.plugin] = this.templateData; return $.when(o);
    },

    /**
     * Show error message returned by server or by validate function. Override if needed.
     * @param {string} error - error message to show
     */
    showError: function(error) {
        CountlyHelpers.alert(error);
    },

    /**
     * Called whenever element value with name in parameter have been changed. Override if needed.
     
     */
    onChange: function(/* name */) { },

    /**
     * Called whenever element value with name in parameter have been changed.
     * @param {string} name - key
     * @param {string} value - value to set
     */
    doOnChange: function(name, value) {

        if (name && countlyCommon.dot(this.templateData, name) !== value) {
            countlyCommon.dot(this.templateData, name, value);
        }

        if (this.isSaveAvailable()) {
            this.el.find('.icon-button').show();
        }
        else {
            this.el.find('.icon-button').hide();
        }

        if (name) {
            this.onChange(name, value);
        }
    },

    /**
     * Save logic: validate, disable save button, submit to the server,
     * show loading dialog if it takes long enough, hide it when done, show error if any, enable save button.
     * @param {event} ev - event
     * @returns {object} error
     */
    save: function(ev) {
        ev.preventDefault();

        if (this.el.find('.icon-button').hasClass('disabled') || !this.isSaveAvailable()) {
            return;
        }

        var error = this.validate(), self = this;
        if (error) {
            return this.showError(error === true ? jQuery.i18n.map['management-applications.plugins.save.nothing'] : error);
        }

        this.el.find('.icon-button').addClass('disabled');

        this.prepare().then(function(data) {
            var dialog, timeout = setTimeout(function() {
                dialog = CountlyHelpers.loading(jQuery.i18n.map['management-applications.plugins.saving']);
            }, 300);

            $.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.apps.w + '/update/plugins',
                data: {
                    app_id: self.appId,
                    api_key: countlyGlobal.member.api_key,
                    args: JSON.stringify(data)
                },
                dataType: "json",
                success: function(result) {
                    self.el.find('.icon-button').removeClass('disabled');
                    clearTimeout(timeout);
                    if (dialog) {
                        CountlyHelpers.removeDialog(dialog);
                    }
                    if (result.result === 'Nothing changed') {
                        CountlyHelpers.notify({type: 'warning', message: jQuery.i18n.map['management-applications.plugins.saved.nothing']});
                    }
                    else {
                        CountlyHelpers.notify({title: jQuery.i18n.map['management-applications.plugins.saved.title'], message: jQuery.i18n.map['management-applications.plugins.saved']});
                        if (!countlyGlobal.apps[result._id].plugins) {
                            countlyGlobal.apps[result._id].plugins = {};
                        }
                        self.savedTemplateData = JSON.stringify(self.templateData);
                        for (var k in result.plugins) {
                            countlyGlobal.apps[result._id].plugins[k] = result.plugins[k];
                        }
                        self.resetTemplateData();
                        self.render();
                    }
                    self.doOnChange();
                },
                error: function(resp) {
                    try {
                        resp = JSON.parse(resp.responseText);
                    }
                    catch (ignored) {
                        //ignored excep
                    }

                    self.el.find('.icon-button').removeClass('disabled');
                    clearTimeout(timeout);
                    if (dialog) {
                        CountlyHelpers.removeDialog(dialog);
                    }
                    self.showError(resp.result || jQuery.i18n.map['management-applications.plugins.error.server']);
                }
            });
        }, function(error1) {
            self.el.find('.icon-button').removeClass('disabled');
            self.showError(error1);
        });
    },

    beforeRender: function() {
        if (this.template) {
            return $.when();
        }
        else {
            var self = this;
            return $.when($.get(countlyGlobal.path + this.templatePath, function(src) {
                self.template = Handlebars.compile(src);
            }));
        }
    },

    render: function() { //backbone.js view render function
        if (!this.savedTemplateData) {
            this.savedTemplateData = JSON.stringify(this.templateData);
        }
        this.el.html(this.template(this.templateData));
        if (!this.el.find('.icon-button').length) {
            $('<a class="icon-button green" data-localize="management-applications.plugins.save" href="#"></a>').hide().appendTo(this.el);
        }

        var self = this;
        this.el.find('.cly-select').each(function(i, select) {
            $(select).off('click', '.item').on('click', '.item', function() {
                self.doOnChange($(select).data('name') || $(select).attr('id'), $(this).data('value'));
            });
        });

        this.el.find('input[type=text], input[type=password], input[type=number]').off('input').on('input', function() {
            self.doOnChange($(this).attr('name') || $(this).attr('id'), $(this).val());
        });

        this.el.find('input[type=file]').off('change').on('change', function() {
            self.doOnChange($(this).attr('name') || $(this).attr('id'), $(this).val());
        });

        this.el.find('.on-off-switch input').on("change", function() {
            var isChecked = $(this).is(":checked"),
                attrID = $(this).attr("id");
            self.doOnChange(attrID, isChecked);
        });

        this.el.find('.icon-button').off('click').on('click', this.save.bind(this));
        if (this.isSaveAvailable()) {
            this.el.find('.icon-button').show();
        }
        else {
            this.el.find('.icon-button').hide();
        }

        app.localize();

        this.afterRender();

        return this;
    },
});

/**
* Drop class with embeded countly theme, use as any Drop class/instance
* @name CountlyDrop
* @global
*/
var CountlyDrop = Drop.createContext({
    classPrefix: 'countly-drop',
});

var initializeOnce = _.once(function() {
    return $.when(countlyEvent.initialize()).then(function() { });
});

var Template = function() {
    this.cached = {};
};
var T = new Template();

$.extend(Template.prototype, {
    render: function(name, callback) {
        if (T.isCached(name)) {
            callback(T.cached[name]);
        }
        else {
            $.get(T.urlFor(name), function(raw) {
                T.store(name, raw);
                T.render(name, callback);
            });
        }
    },
    renderSync: function(name, callback) {
        if (!T.isCached(name)) {
            T.fetch(name);
        }
        T.render(name, callback);
    },
    prefetch: function(name) {
        $.get(T.urlFor(name), function(raw) {
            T.store(name, raw);
        });
    },
    fetch: function(name) {
        // synchronous, for those times when you need it.
        if (!T.isCached(name)) {
            var raw = $.ajax({ 'url': T.urlFor(name), 'async': false }).responseText;
            T.store(name, raw);
        }
    },
    isCached: function(name) {
        return !!T.cached[name];
    },
    store: function(name, raw) {
        T.cached[name] = Handlebars.compile(raw);
    },
    urlFor: function(name) {
        //return "/resources/templates/"+ name + ".handlebars";
        return name + ".html";
    }
});

//redefine contains selector for jquery to be case insensitive
$.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function(elem) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});

/**
 * Main app instance of Backbone AppRouter used to control views and view change flow
 * @name app
 * @global
 * @instance
 * @namespace app
 */
var AppRouter = Backbone.Router.extend({
    routes: {
        "/": "dashboard",
        "*path": "main"
    },
    /**
    * View that is currently being displayed
    * @type {countlyView}
    * @instance
    * @memberof app
    */
    activeView: null, //current view
    dateToSelected: null, //date to selected from the date picker
    dateFromSelected: null, //date from selected from the date picker
    activeAppName: '',
    activeAppKey: '',
    _isFirstLoad: false, //to know if we are switching between two apps or just loading page
    refreshActiveView: 0, //refresh interval function reference
    _myRequests: {}, //save requests not connected with view to prevent calling the same if previous not finished yet.
    /**
    * Navigate to another view programmatically. If you need to change the view without user clicking anything, like redirect. You can do this using this method. This method is not define by countly but is direct method of AppRouter object in Backbone js
    * @name app#navigate
    * @function
    * @instance
    * @param {string} fragment - url path (hash part) where to redirect user
    * @param {boolean=} triggerRoute - to trigger route call, like initialize new view, etc. Default is false, so you may want to use false when redirecting to URL for your own same view where you are already, so no need to reload it
    * @memberof app
    * @example <caption>Redirect to url of the same view</caption>
    * //you are at #/manage/systemlogs
    * app.navigate("#/manage/systemlogs/query/{}");
    *
    * @example <caption>Redirect to url of other view</caption>
    * //you are at #/manage/systemlogs
    * app.navigate("#/crashes", true);
    */
    _removeUnfinishedRequests: function() {
        for (var url in this._myRequests) {
            for (var data in this._myRequests[url]) {
                //4 means done, less still in progress
                if (parseInt(this._myRequests[url][data].readyState) !== 4) {
                    this._myRequests[url][data].abort();
                }
            }
        }
        this._myRequests = {};
    },
    switchApp: function(app_id, callback) {
        countlyCommon.setActiveApp(app_id);

        $("#active-app-name").text(countlyGlobal.apps[app_id].name);
        $("#active-app-icon").css("background-image", "url('" + countlyGlobal.path + "appimages/" + app_id + ".png')");

        app.onAppSwitch(app_id, true);

        //removing requests saved in app
        app._removeUnfinishedRequests();
        if (app && app.activeView) {
            app.activeView._removeMyRequests();//remove requests for view(if not finished)
            app.activeView.appChanged(callback);
        }
    },
    main: function(/*forced*/) {
        var change = true,
            redirect = false;
        // detect app switch like
        //#/app/586e32ddc32cb30a01558cc1/analytics/events
        if (Backbone.history.fragment.indexOf("/app/") === 0) {
            var app_id = Backbone.history.fragment.replace("/app/", "");
            redirect = "#/";
            if (app_id && app_id.length) {
                if (app_id.indexOf("/") !== -1) {
                    var parts = app_id.split("/");
                    app_id = parts.shift();
                    redirect = "#/" + parts.join("/");
                }
                if (app_id !== countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[app_id]) {
                    countlyCommon.setActiveApp(app_id);

                    $("#active-app-name").text(countlyGlobal.apps[app_id].name);
                    $("#active-app-icon").css("background-image", "url('" + countlyGlobal.path + "appimages/" + app_id + ".png')");

                    app.onAppSwitch(app_id);
                    app.activeView.appChanged(function() {
                        app.navigate(redirect, true);
                    });
                    return;
                }
            }
        }
        else if (Backbone.history.fragment !== "/" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
            $("#" + countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type + "-type a").each(function() {
                if (this.hash !== "#/" && this.hash !== "") {
                    if ("#" + Backbone.history.fragment === this.hash && $(this).css('display') !== 'none') {
                        change = false;
                        return false;
                    }
                    else if (("#" + Backbone.history.fragment).indexOf(this.hash) === 0 && $(this).css('display') !== 'none') {
                        redirect = this.hash;
                        return false;
                    }
                }
            });
        }

        if (redirect) {
            app.navigate(redirect, true);
        }
        else if (change) {
            if (Backbone.history.fragment !== "/") {
                this.navigate("#/", true);
            }
            else if (countlyCommon.APP_NAMESPACE !== false) {
                this.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment, true);
            }
            else {
                this.dashboard();
            }
        }
        else {
            if (countlyCommon.APP_NAMESPACE !== false) {
                this.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment, true);
            }
            else {
                this.activeView.render();
            }
        }
    },
    dashboard: function() {
        if (countlyGlobal.member.restrict && countlyGlobal.member.restrict.indexOf("#/") !== -1) {
            return;
        }
        if (_.isEmpty(countlyGlobal.apps)) {
            this.renderWhenReady(this.manageAppsView);
        }
        else if (typeof this.appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type] !== "undefined") {
            this.renderWhenReady(this.appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]);
        }
        else {
            this.renderWhenReady(this.dashboardView);
        }
    },
    runRefreshScripts: function() {
        var i = 0;
        var l = 0;
        if (this.refreshScripts[Backbone.history.fragment]) {
            for (i = 0, l = this.refreshScripts[Backbone.history.fragment].length; i < l; i++) {
                this.refreshScripts[Backbone.history.fragment][i]();
            }
        }
        for (var k in this.refreshScripts) {
            if (k !== '#' && k.indexOf('#') !== -1 && Backbone.history.fragment.match(k.replace(/#/g, '.*'))) {
                for (i = 0, l = this.refreshScripts[k].length; i < l; i++) {
                    this.refreshScripts[k][i]();
                }
            }
        }
        if (this.refreshScripts["#"]) {
            for (i = 0, l = this.refreshScripts["#"].length; i < l; i++) {
                this.refreshScripts["#"][i]();
            }
        }

    },
    performRefresh: function(self) {
        //refresh only if we are on current period
        if (countlyCommon.periodObj.periodContainsToday && self.activeView.isLoaded) {
            self.activeView.isLoaded = false;
            $.when(self.activeView.refresh()).always(function() {
                self.activeView.isLoaded = true;
                self.runRefreshScripts();
            });
        }
    },
    renderWhenReady: function(viewName) { //all view renders end up here
        // If there is an active view call its destroy function to perform cleanups before a new view renders

        if (this.activeView) {
            this.activeView._removeMyRequests();
            this.activeView.destroy();
        }

        if (window.components && window.components.slider && window.components.slider.instance) {
            window.components.slider.instance.close();
        }

        this.activeView = viewName;

        clearInterval(this.refreshActiveView);
        if (typeof countlyGlobal.member.password_changed === "undefined") {
            countlyGlobal.member.password_changed = Math.round(new Date().getTime() / 1000);
        }
        this.routesHit++;

        if (_.isEmpty(countlyGlobal.apps)) {
            if (Backbone.history.fragment !== "/manage/apps") {
                this.navigate("/manage/apps", true);
            }
            else {
                viewName.render();
            }
            return false;
        }
        else if (countlyGlobal.security.password_expiration > 0 && countlyGlobal.member.password_changed + countlyGlobal.security.password_expiration * 24 * 60 * 60 < new Date().getTime() / 1000) {
            if (Backbone.history.fragment !== "/manage/user-settings/reset") {
                this.navigate("/manage/user-settings/reset", true);
            }
            else {
                viewName.render();
            }
            return false;
        }
        viewName.render();
        var self = this;
        this.refreshActiveView = setInterval(function() {
            self.performRefresh(self);
        }, countlyCommon.DASHBOARD_REFRESH_MS);

        if (countlyGlobal && countlyGlobal.message) {
            CountlyHelpers.parseAndShowMsg(countlyGlobal.message);
        }

        // Init sidebar based on the current url
        self.sidebar.init();
    },
    sidebar: {
        init: function() {
            setTimeout(function() {
                $("#sidebar-menu").find(".item").removeClass("active menu-active");
                var selectedMenu = $($("#sidebar-menu").find("a[href='#" + Backbone.history.fragment + "']"));

                if (!selectedMenu.length) {
                    var parts = Backbone.history.fragment.split("/");
                    selectedMenu = $($("#sidebar-menu").find("a[href='#/" + (parts[1] || "") + "']"));
                    if (!selectedMenu.length) {
                        selectedMenu = $($("#sidebar-menu").find("a[href='#/" + (parts[1] + "/" + parts[2] || "") + "']"));
                    }
                }

                var selectedSubmenu = selectedMenu.parents(".sidebar-submenu");

                if (selectedSubmenu.length) {
                    selectedMenu.addClass("active");
                    selectedSubmenu.prev().addClass("active menu-active");
                    app.sidebar.submenu.toggle(selectedSubmenu);
                }
                else {
                    selectedMenu.addClass("active");
                    app.sidebar.submenu.toggle();
                }
            }, 1000);
        },
        submenu: {
            toggle: function(el) {
                $(".sidebar-submenu").removeClass("half-visible");

                if (!el) {
                    $(".sidebar-submenu:visible").animate({ "right": "-170px" }, {
                        duration: 300,
                        easing: 'easeOutExpo',
                        complete: function() {
                            $(this).hide();
                        }
                    });
                    return true;
                }

                if (!el.is(":visible")) {
                    if ($(".sidebar-submenu").is(":visible")) {
                        $(".sidebar-submenu").hide();
                        el.css({ "right": "-110px" }).show().animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                        addText();
                    }
                    else {
                        el.css({ "right": "-170px" }).show().animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                        addText();
                    }
                }
                /** function add text to menu title */
                function addText() {
                    var mainMenuText = $(el.prev()[0]).find(".text").text();

                    $(".menu-title").remove();
                    var menuTitle = $("<div class='menu-title'></div>").text(mainMenuText).prepend("<i class='submenu-close ion-close'></i>");
                    el.prepend(menuTitle);

                    // Try setting submenu title once again if it was empty
                    // during previous try
                    if (!mainMenuText) {
                        setTimeout(function() {
                            $(".menu-title").text($(el.prev()[0]).find(".text").text());
                            $(".menu-title").prepend("<i class='submenu-close ion-close'></i>");
                        }, 1000);
                    }
                }
            }
        }
    },

    hasRoutingHistory: function() {
        if (this.routesHit > 1) {
            return true;
        }
        return false;
    },
    back: function(fallback_route) {
        if (this.routesHit > 1) {
            window.history.back();
        }
        else {
            var fragment = Backbone.history.getFragment();
            //route not passed, try  to guess from current location
            if (typeof fallback_route === "undefined" || fallback_route === "") {
                if (fragment) {
                    var parts = fragment.split("/");
                    if (parts.length > 1) {
                        fallback_route = "/" + parts[1];
                    }
                }
            }
            if (fallback_route === fragment) {
                fallback_route = '/';
            }
            this.navigate(fallback_route || '/', {trigger: true, replace: true});
        }
    },
    initialize: function() { //initialize the dashboard, register helpers etc.
        this.appTypes = {};
        this.pageScripts = {};
        this.dataExports = {};
        this.appSwitchCallbacks = [];
        this.appManagementSwitchCallbacks = [];
        this.appObjectModificators = [];
        this.appManagementViews = {};
        this.appAddTypeCallbacks = [];
        this.userEditCallbacks = [];
        this.refreshScripts = {};
        this.appSettings = {};
        this.widgetCallbacks = {};

        this.routesHit = 0; //keep count of number of routes handled by your application
        /**
        * When rendering data from server using templates from frontend/express/views we are using ejs as templating engine. But when rendering templates on the browser side remotely loaded templates through ajax, we are using Handlebars templating engine. While in ejs everything is simple and your templating code is basically javascript code betwee <% %> tags. Then with Handlebars it is not that straightforward and we need helper functions to have some common templating logic
        * @name Handlebars
        * @global
        * @instance
        * @namespace Handlebars
        */

        /**
        * Display common date selecting UI elements
        * @name date-selector
        * @memberof Handlebars
        * @example
        * {{> date-selector }}
        */
        Handlebars.registerPartial("date-selector", $("#template-date-selector").html());
        /**
        * Display common timezone selecting UI element
        * @name timezones
        * @memberof Handlebars
        * @example
        * {{> timezones }}
        */
        Handlebars.registerPartial("timezones", $("#template-timezones").html());
        /**
        * Display common app category selecting UI element
        * @name app-categories
        * @memberof Handlebars
        * @example
        * {{> app-categories }}
        */
        Handlebars.registerPartial("app-categories", $("#template-app-categories").html());
        /**
        * Iterate object with keys and values, creating variable "property" for object key and variable "value" for object value
        * @name eachOfObject
        * @memberof Handlebars
        * @example
        * {{#eachOfObject app_types}}
        *   <div data-value="{{property}}" class="item">{{value}}</div>
        * {{/eachOfObject}}
        */
        Handlebars.registerHelper('eachOfObject', function(context, options) {
            var ret = "";
            for (var prop in context) {
                ret = ret + options.fn({ property: prop, value: context[prop] });
            }
            return ret;
        });
        /**
        * Iterate only values of object, this will reference the value of current object
        * @name eachOfObjectValue
        * @memberof Handlebars
        * @example
        * {{#eachOfObjectValue apps}}
		* <div class="app searchable">
		* 	<div class="image" style="background-image: url('/appimages/{{this._id}}.png');"></div>
		* 	<div class="name">{{this.name}}</div>
		* 	<input class="app_id" type="hidden" value="{{this._id}}"/>
		* </div>
		* {{/eachOfObjectValue}}
        */
        Handlebars.registerHelper('eachOfObjectValue', function(context, options) {
            var ret = "";
            for (var prop in context) {
                ret = ret + options.fn(context[prop]);
            }
            return ret;
        });
        /**
        * Iterate through array, creating variable "index" for element index and variable "value" for value at that index
        * @name eachOfArray
        * @memberof Handlebars
        * @example
        * {{#eachOfArray events}}
		* <div class="searchable event-container {{#if value.is_active}}active{{/if}}" data-key="{{value.key}}">
		* 	<div class="name">{{value.name}}</div>
		* </div>
		* {{/eachOfArray}}
        */
        Handlebars.registerHelper('eachOfArray', function(context, options) {
            var ret = "";
            for (var i = 0; i < context.length; i++) {
                ret = ret + options.fn({ index: i, value: context[i] });
            }
            return ret;
        });
        /**
        * Print out json in pretty indented way
        * @name prettyJSON
        * @memberof Handlebars
        * @example
        * <td class="jh-value jh-object-value">{{prettyJSON value}}</td>
        */
        Handlebars.registerHelper('prettyJSON', function(context) {
            return JSON.stringify(context, undefined, 4);
        });
        /**
        * Shorten number, Handlebar binding to {@link countlyCommon.getShortNumber}
        * @name getShortNumber
        * @memberof Handlebars
        * @example
        * <span class="value">{{getShortNumber this.data.total}}</span>
        */
        Handlebars.registerHelper('getShortNumber', function(context) {
            return countlyCommon.getShortNumber(context);
        });
        /**
        * Format float number up to 2 values after dot
        * @name getFormattedNumber
        * @memberof Handlebars
        * @example
        * <div class="number">{{getFormattedNumber this.total}}</div>
        */
        Handlebars.registerHelper('getFormattedNumber', function(context) {
            if (isNaN(context)) {
                return context;
            }

            var ret = parseFloat((parseFloat(context).toFixed(2)).toString()).toString();
            return ret.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        });
        /**
        * Convert text to upper case
        * @name toUpperCase
        * @memberof Handlebars
        * @example
        * <div class="title">{{toUpperCase page-title}}</div>
        */
        Handlebars.registerHelper('toUpperCase', function(context) {
            return context.toUpperCase();
        });
        /**
        * Convert array of app ids to comma separate string of app names. Handlebar binding to {@link CountlyHelpers.appIdsToNames}
        * @name appIdsToNames
        * @memberof Handlebars
        * @example
        * <div class="apps">{{appIdsToNames appIds}}</div>
        */
        Handlebars.registerHelper('appIdsToNames', function(context) {
            return CountlyHelpers.appIdsToNames(context);
        });
        /**
        * Loop for specified amount of times. Creating variable "count" as current index from 1 to provided value
        * @name forNumberOfTimes
        * @memberof Handlebars
        * @example
        * <ul>
        * {{#forNumberOfTimes 10}}
		*   <li>{{count}}</li>
		* {{/forNumberOfTimes}}
        * </ul>
        */
        Handlebars.registerHelper('forNumberOfTimes', function(context, options) {
            var ret = "";
            for (var i = 0; i < context; i++) {
                ret = ret + options.fn({ count: i + 1 });
            }
            return ret;
        });
        /**
        * Loop for specified amount of times. with variable "need" & "now", loop time will be ${need} - ${now}
        * @name forNumberOfTimes
        * @memberof Handlebars
        * @example
        * <ul>
        * {{#forNumberOfTimes 10 3}}  // will loop 7 times
		*   <li>{{count}}</li>
		* {{/forNumberOfTimes}}
        * </ul>
        */

        Handlebars.registerHelper('forNumberOfTimesCalc', function(need, now, options) {
            var ret = "";
            var context = parseInt(need) - parseInt(now) ;
            for (var i = 0; i < context; i++) {
                ret = ret + options.fn({ count: i + 1 });
            }
            return ret;
        });
        /**
        * Replaces part of a string with a string.
        * @name replace
        * @memberof Handlebars
        * @example
        * <span>{{#replace value "(" " ("}}{{/replace}}</span>
		*/
        Handlebars.registerHelper('replace', function(string, to_replace, replacement) {
            return (string || '').replace(to_replace, replacement);
        });
        /**
        * Limit string length.
        * @name limitString
        * @memberof Handlebars
        * @example
        * <span>{{#limitString value 15}}{{/limitString}}</span>
		*/
        Handlebars.registerHelper('limitString', function(string, limit) {
            if (string.length > limit) {
                return (string || '').substr(0, limit) + "..";
            }
            else {
                return string;
            }
        });
        Handlebars.registerHelper('include', function(templatename, options) {
            var partial = Handlebars.partials[templatename];
            var context = $.extend({}, this, options.hash);
            return partial(context);
        });
        /**
        * For loop in template providing start count, end count and increment
        * @name for
        * @memberof Handlebars
        * @example
        * {{#for start end 1}}
		* 	{{#ifCond this "==" ../data.curPage}}
		* 	<a href='#/manage/db/{{../../db}}/{{../../collection}}/page/{{this}}' class="current">{{this}}</a>
		* 	{{else}}
		* 	<a href='#/manage/db/{{../../db}}/{{../../collection}}/page/{{this}}'>{{this}}</a>
		* 	{{/ifCond}}
		* {{/for}}
        */
        Handlebars.registerHelper('for', function(from, to, incr, block) {
            var accum = '';
            for (var i = from; i < to; i += incr) {
                accum += block.fn(i);
            }
            return accum;
        });
        /**
        * If condition with different operators, accepting first value, operator and second value.
        * Accepted operators are ==, !=, ===, <, <=, >, >=, &&, ||
        * @name ifCond
        * @memberof Handlebars
        * @example
        * {{#ifCond this.data.trend "==" "u"}}
        *     <i class="material-icons">trending_up</i>
        * {{else}}
        *     <i class="material-icons">trending_down</i>
        * {{/ifCond}}
        */
        Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
            switch (operator) {
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this); // eslint-disable-line
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this); // eslint-disable-line
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
            }
        });
        /**
        * Format timestamp to twitter like time ago format, Handlebar binding to {@link countlyCommon.formatTimeAgo}
        * @name formatTimeAgo
        * @memberof Handlebars
        * @example
        * <div class="time">{{{formatTimeAgo value.time}}</div>
        */
        Handlebars.registerHelper('formatTimeAgo', function(context) {
            return countlyCommon.formatTimeAgo(parseInt(context) / 1000);
        });
        /**
        * Get value form object by specific key, this will reference value of the object
        * @name withItem
        * @memberof Handlebars
        * @example
        * <p>{{#withItem ../apps key=app_id}}{{this}}{{/withItem}}</p>
        */
        Handlebars.registerHelper('withItem', function(object, options) {
            return options.fn(object[options.hash.key]);
        });

        var self = this;
        jQuery.i18n.properties({
            name: 'locale',
            cache: true,
            language: countlyCommon.BROWSER_LANG_SHORT,
            countlyVersion: countlyGlobal.countlyVersion + "&" + countlyGlobal.pluginsSHA,
            path: [countlyGlobal.cdn + 'localization/min/'],
            mode: 'map',
            callback: function() {
                self.origLang = JSON.stringify(jQuery.i18n.map);
            }
        });

        $(document).ready(function() {

            CountlyHelpers.initializeSelect();
            CountlyHelpers.initializeTextSelect();
            CountlyHelpers.initializeMultiSelect();

            $.ajaxPrefilter(function(options) {
                var last5char = options.url.substring(options.url.length - 5, options.url.length);
                if (last5char === ".html") {
                    var version = countlyGlobal.countlyVersion || "";
                    options.url = options.url + "?v=" + version;
                }
            });
            var validateSession = function() {
                $.ajax({
                    url: countlyGlobal.path + "/session",
                    data: {check_session: true},
                    success: function(result) {
                        if (result === "logout") {
                            $("#user-logout").click();
                            window.location = "/logout";
                        }
                        if (result === "login") {
                            $("#user-logout").click();
                            window.location = "/login";
                        }
                        setTimeout(function() {
                            validateSession();
                        }, countlyCommon.DASHBOARD_VALIDATE_SESSION || 30000);
                    }
                });
            };
            setTimeout(function() {
                validateSession();
            }, countlyCommon.DASHBOARD_VALIDATE_SESSION || 30000);//validates session each 30 seconds
            if (parseInt(countlyGlobal.config.session_timeout)) {
                var minTimeout, tenSecondTimeout, logoutTimeout;
                var shouldRecordAction = false;
                var extendSession = function() {
                    $.ajax({
                        url: countlyGlobal.path + "/session",
                        success: function(result) {
                            if (result === "logout") {
                                $("#user-logout").click();
                                window.location = "/logout";
                            }
                            if (result === "login") {
                                $("#user-logout").click();
                                window.location = "/login";
                            }
                            else if (result === "success") {
                                shouldRecordAction = false;
                                var myTimeoutValue = parseInt(countlyGlobal.config.session_timeout) * 1000 * 60;
                                if (myTimeoutValue > 2147483647) { //max value used by set timeout function
                                    myTimeoutValue = 1800000;//30 minutes
                                }
                                setTimeout(function() {
                                    shouldRecordAction = true;
                                }, Math.round(myTimeoutValue / 2));
                                resetSessionTimeouts(myTimeoutValue);
                            }
                        }
                    });
                };

                var resetSessionTimeouts = function(timeout) {
                    var minute = timeout - 60 * 1000;
                    if (minTimeout) {
                        clearTimeout(minTimeout);
                        minTimeout = null;
                    }
                    if (minute > 0) {
                        minTimeout = setTimeout(function() {
                            CountlyHelpers.notify({ title: jQuery.i18n.map["common.session-expiration"], message: jQuery.i18n.map["common.expire-minute"], info: jQuery.i18n.map["common.click-to-login"] });
                        }, minute);
                    }
                    var tenSeconds = timeout - 10 * 1000;
                    if (tenSecondTimeout) {
                        clearTimeout(tenSecondTimeout);
                        tenSecondTimeout = null;
                    }
                    if (tenSeconds > 0) {
                        tenSecondTimeout = setTimeout(function() {
                            CountlyHelpers.notify({ title: jQuery.i18n.map["common.session-expiration"], message: jQuery.i18n.map["common.expire-seconds"], info: jQuery.i18n.map["common.click-to-login"] });
                        }, tenSeconds);
                    }
                    if (logoutTimeout) {
                        clearTimeout(logoutTimeout);
                        logoutTimeout = null;
                    }
                    logoutTimeout = setTimeout(function() {
                        extendSession();
                    }, timeout + 1000);
                };

                var myTimeoutValue = parseInt(countlyGlobal.config.session_timeout) * 1000 * 60;
                //max value used by set timeout function
                if (myTimeoutValue > 2147483647) {
                    myTimeoutValue = 1800000;
                }//30 minutes
                resetSessionTimeouts(myTimeoutValue);
                $(document).on("click mousemove extend-dashboard-user-session", function() {
                    if (shouldRecordAction) {
                        extendSession();
                    }
                });
                extendSession();
            }

            // If date range is selected initialize the calendar with these
            var periodObj = countlyCommon.getPeriod();
            if (Object.prototype.toString.call(periodObj) === '[object Array]' && periodObj.length === 2) {
                self.dateFromSelected = countlyCommon.getPeriod()[0];
                self.dateToSelected = countlyCommon.getPeriod()[1];
            }

            // Initialize localization related stuff

            // Localization test
            /*
             $.each(jQuery.i18n.map, function (key, value) {
             jQuery.i18n.map[key] = key;
             });
             */

            try {
                moment.locale(countlyCommon.BROWSER_LANG_SHORT);
            }
            catch (e) {
                moment.locale("en");
            }

            $(".reveal-language-menu").text(countlyCommon.BROWSER_LANG_SHORT.toUpperCase());

            $("#sidebar-events").click(function(e) {
                $.when(countlyEvent.refreshEvents()).then(function() {
                    if (countlyEvent.getEvents().length === 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["events.no-event"], "black");
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                });
            });

            // SIDEBAR
            $("#sidebar-menu").on("click", ".submenu-close", function() {
                $(this).parents(".sidebar-submenu").animate({ "right": "-170px" }, {
                    duration: 200,
                    easing: 'easeInExpo',
                    complete: function() {
                        $(".sidebar-submenu").hide();
                        $("#sidebar-menu>.sidebar-menu>.item").removeClass("menu-active");
                    }
                });
            });

            $("#sidebar-menu").on("click", ".item", function() {
                if ($(this).hasClass("menu-active")) {
                    return true;
                }

                $("#sidebar-menu>.sidebar-menu>.item").removeClass("menu-active");

                var elNext = $(this).next();

                if (elNext.hasClass("sidebar-submenu")) {
                    $(this).addClass("menu-active");
                    self.sidebar.submenu.toggle(elNext);
                }
                else {
                    $("#sidebar-menu").find(".item").removeClass("active");
                    $(this).addClass("active");

                    var mainMenuItem = $(this).parent(".sidebar-submenu").prev(".item");

                    if (mainMenuItem.length) {
                        mainMenuItem.addClass("active menu-active");
                    }
                    else {
                        self.sidebar.submenu.toggle();
                    }
                }
            });

            $("#sidebar-menu").hoverIntent({
                over: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if (!$(this).hasClass("menu-active") && $(".sidebar-submenu").is(":visible") && !visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.addClass("half-visible");
                        visibleSubmenu.animate({ "right": "-110px" }, { duration: 300, easing: 'easeOutExpo' });
                    }
                },
                out: function() { },
                selector: ".sidebar-menu>.item"
            });

            $("#sidebar-menu").hoverIntent({
                over: function() { },
                out: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if ($(".sidebar-submenu").is(":visible") && visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.removeClass("half-visible");
                        visibleSubmenu.animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                    }
                },
                selector: ""
            });

            $("#sidebar-menu").hoverIntent({
                over: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if (visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.removeClass("half-visible");
                        visibleSubmenu.animate({ "right": "0" }, { duration: 300, easing: 'easeOutExpo' });
                    }
                },
                out: function() { },
                selector: ".sidebar-submenu:visible"
            });

            $('#sidebar-menu').slimScroll({
                height: ($(window).height()) + 'px',
                railVisible: true,
                railColor: '#4CC04F',
                railOpacity: .2,
                color: '#4CC04F',
                disableFadeOut: false,
            });
            $(window).resize(function() {
                $('#sidebar-menu').slimScroll({
                    height: ($(window).height()) + 'px'
                });
            });

            $(".sidebar-submenu").on("click", ".item", function() {
                if ($(this).hasClass("disabled")) {
                    return true;
                }

                $(".sidebar-submenu .item").removeClass("active");
                $(this).addClass("active");
                $(this).parent().prev(".item").addClass("active");
            });

            $("#language-menu .item").click(function() {
                var langCode = $(this).data("language-code"),
                    langCodeUpper = langCode.toUpperCase();

                store.set("countly_lang", langCode);
                $(".reveal-language-menu").text(langCodeUpper);

                countlyCommon.BROWSER_LANG_SHORT = langCode;
                countlyCommon.BROWSER_LANG = langCode;

                try {
                    moment.locale(countlyCommon.BROWSER_LANG_SHORT);
                }
                catch (e) {
                    moment.locale("en");
                }

                countlyCommon.getMonths(true);

                $("#date-to").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
                $("#date-from").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

                $.ajax({
                    type: "POST",
                    url: countlyGlobal.path + "/user/settings/lang",
                    data: {
                        "username": countlyGlobal.member.username,
                        "lang": countlyCommon.BROWSER_LANG_SHORT,
                        _csrf: countlyGlobal.csrf_token
                    },
                    success: function() { }
                });

                jQuery.i18n.properties({
                    name: 'locale',
                    cache: true,
                    language: countlyCommon.BROWSER_LANG_SHORT,
                    countlyVersion: countlyGlobal.countlyVersion + "&" + countlyGlobal.pluginsSHA,
                    path: [countlyGlobal.cdn + 'localization/min/'],
                    mode: 'map',
                    callback: function() {
                        self.origLang = JSON.stringify(jQuery.i18n.map);
                        $.when(countlyLocation.changeLanguage()).then(function() {
                            self.activeView.render();
                        });
                    }
                });
            });

            $("#save-account-details:not(.disabled)").live('click', function() {
                var username = $(".dialog #username").val(),
                    old_pwd = $(".dialog #old_pwd").val(),
                    new_pwd = $(".dialog #new_pwd").val(),
                    re_new_pwd = $(".dialog #re_new_pwd").val(),
                    api_key = $(".dialog #api-key").val();

                if (new_pwd !== re_new_pwd) {
                    $(".dialog #settings-save-result").addClass("red").text(jQuery.i18n.map["user-settings.password-match"]);
                    return true;
                }

                $(this).addClass("disabled");

                $.ajax({
                    type: "POST",
                    url: countlyGlobal.path + "/user/settings",
                    data: {
                        "username": username,
                        "old_pwd": old_pwd,
                        "new_pwd": new_pwd,
                        "api_key": api_key,
                        _csrf: countlyGlobal.csrf_token
                    },
                    success: function(result) {
                        var saveResult = $(".dialog #settings-save-result");

                        if (result === "username-exists") {
                            saveResult.removeClass("green").addClass("red").text(jQuery.i18n.map["management-users.username.exists"]);
                        }
                        else if (!result) {
                            saveResult.removeClass("green").addClass("red").text(jQuery.i18n.map["user-settings.alert"]);
                        }
                        else {
                            saveResult.removeClass("red").addClass("green").text(jQuery.i18n.map["user-settings.success"]);
                            $(".dialog #old_pwd").val("");
                            $(".dialog #new_pwd").val("");
                            $(".dialog #re_new_pwd").val("");
                            $("#menu-username").text(username);
                            $("#user-api-key").val(api_key);
                            countlyGlobal.member.username = username;
                            countlyGlobal.member.api_key = api_key;
                        }

                        $(".dialog #save-account-details").removeClass("disabled");
                    }
                });
            });

            var help = _.once(function() {
                CountlyHelpers.alert(jQuery.i18n.map["help.help-mode-welcome"], "popStyleGreen popStyleGreenWide", {button_title: jQuery.i18n.map["common.okay"] + "!", title: jQuery.i18n.map["help.help-mode-welcome-title"], image: "welcome-to-help-mode"});
            });

            $(".help-toggle, #help-toggle").click(function(e) {

                e.stopPropagation();
                $(".help-toggle #help-toggle").toggleClass("active");

                app.tipsify($(".help-toggle #help-toggle").hasClass("active"));

                if ($(".help-toggle #help-toggle").hasClass("active")) {
                    help();
                    $.idleTimer('destroy');
                    clearInterval(self.refreshActiveView);
                }
                else {
                    self.refreshActiveView = setInterval(function() {
                        self.performRefresh(self);
                    }, countlyCommon.DASHBOARD_REFRESH_MS);
                    $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);
                }
            });

            $("#user-logout").click(function() {
                store.remove('countly_active_app');
                store.remove('countly_date');
                store.remove('countly_location_city');
            });

            $(".beta-button").click(function() {
                CountlyHelpers.alert("This feature is currently in beta so the data you see in this view might change or disappear into thin air.<br/><br/>If you find any bugs or have suggestions please let us know!<br/><br/><a style='font-weight:500;'>Captain Obvious:</a> You can use the message box that appears when you click the question mark on the bottom right corner of this page.", "black");
            });

            $("#content").on("click", "#graph-note", function() {
                CountlyHelpers.popup("#graph-note-popup");

                $(".note-date:visible").datepicker({
                    numberOfMonths: 1,
                    showOtherMonths: true,
                    onSelect: function() {
                        dateText();
                    }
                });

                $.datepicker.setDefaults($.datepicker.regional[""]);
                $(".note-date:visible").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

                $('.note-popup:visible .time-picker, .note-popup:visible .note-list').slimScroll({
                    height: '100%',
                    start: 'top',
                    wheelStep: 10,
                    position: 'right',
                    disableFadeOut: true
                });

                $(".note-popup:visible .time-picker span").on("click", function() {
                    $(".note-popup:visible .time-picker span").removeClass("selected");
                    $(this).addClass("selected");
                    dateText();
                });


                $(".note-popup:visible .manage-notes-button").on("click", function() {
                    $(".note-popup:visible .note-create").hide();
                    $(".note-popup:visible .note-manage").show();
                    $(".note-popup:visible .create-note-button").show();
                    $(this).hide();
                    $(".note-popup:visible .create-note").hide();
                });

                $(".note-popup:visible .create-note-button").on("click", function() {
                    $(".note-popup:visible .note-create").show();
                    $(".note-popup:visible .note-manage").hide();
                    $(".note-popup:visible .manage-notes-button").show();
                    $(this).hide();
                    $(".note-popup:visible .create-note").show();
                });

                dateText();
                /** sets selected date text */
                function dateText() {
                    var selectedDate = $(".note-date:visible").val(),
                        instance = $(".note-date:visible").data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                    $(".selected-date:visible").text(moment(date).format("D MMM YYYY") + ", " + $(".time-picker:visible span.selected").text());
                }

                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes) {
                    var noteDateIds = _.sortBy(_.keys(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes), function(el) {
                        return -parseInt(el);
                    });

                    for (var i = 0; i < noteDateIds.length; i++) {
                        var currNotes = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes[noteDateIds[i]];

                        for (var j = 0; j < currNotes.length; j++) {
                            $(".note-popup:visible .note-list").append(
                                '<div class="note">' +
                                '<div class="date" data-dateid="' + noteDateIds[i] + '">' + moment(noteDateIds[i], "YYYYMMDDHH").format("D MMM YYYY, HH:mm") + '</div>' +
                                '<div class="content">' + currNotes[j] + '</div>' +
                                '<div class="delete-note"><i class="fa fa-trash"></i></div>' +
                                '</div>'
                            );
                        }
                    }
                }

                if (!$(".note-popup:visible .note").length) {
                    $(".note-popup:visible .manage-notes-button").hide();
                }

                $('.note-popup:visible .note-content').textcounter({
                    max: 50,
                    countDown: true,
                    countDownText: "remaining "
                });

                $(".note-popup:visible .note .delete-note").on("click", function() {
                    var dateId = $(this).siblings(".date").data("dateid"),
                        note = $(this).siblings(".content").text();

                    $(this).parents(".note").fadeOut().remove();

                    $.ajax({
                        type: "POST",
                        url: countlyGlobal.path + '/graphnotes/delete',
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "date_id": dateId,
                            "note": note,
                            _csrf: countlyGlobal.csrf_token
                        },
                        success: function(result) {
                            if (result === false) {
                                return false;
                            }
                            else {
                                updateGlobalNotes({ date_id: dateId, note: note }, "delete");
                                app.activeView.refresh();
                            }
                        }
                    });

                    if (!$(".note-popup:visible .note").length) {
                        $(".note-popup:visible .create-note-button").trigger("click");
                        $(".note-popup:visible .manage-notes-button").hide();
                    }
                });

                $(".note-popup:visible .create-note").on("click", function() {
                    if ($(this).hasClass("disabled")) {
                        return true;
                    }

                    $(this).addClass("disabled");

                    var selectedDate = $(".note-date:visible").val(),
                        instance = $(".note-date:visible").data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
                        dateId = moment(moment(date).format("D MMM YYYY") + ", " + $(".time-picker:visible span.selected").text(), "D MMM YYYY, HH:mm").format("YYYYMMDDHH"),
                        note = $(".note-popup:visible .note-content").val();

                    if (!note.length) {
                        $(".note-popup:visible .note-content").addClass("required-border");
                        $(this).removeClass("disabled");
                        return true;
                    }
                    else {
                        $(".note-popup:visible .note-content").removeClass("required-border");
                    }

                    $.ajax({
                        type: "POST",
                        url: countlyGlobal.path + '/graphnotes/create',
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "date_id": dateId,
                            "note": note,
                            _csrf: countlyGlobal.csrf_token
                        },
                        success: function(result) {
                            if (result === false) {
                                return false;
                            }
                            else {
                                updateGlobalNotes({ date_id: dateId, note: result }, "create");
                                app.activeView.refresh();
                            }
                        }
                    });

                    $("#overlay").trigger("click");
                });
                /** function updates global notes
                * @param {object} noteObj - note object
                * @param {string} operation - create or delete
                */
                function updateGlobalNotes(noteObj, operation) {
                    var globalNotes = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes;

                    if (operation === "create") {
                        if (globalNotes) {
                            if (globalNotes[noteObj.date_id]) {
                                countlyCommon.arrayAddUniq(globalNotes[noteObj.date_id], noteObj.note);
                            }
                            else {
                                globalNotes[noteObj.date_id] = [noteObj.note];
                            }
                        }
                        else {
                            var tmpNote = {};
                            tmpNote[noteObj.date_id] = [noteObj.note];

                            countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes = tmpNote;
                        }
                    }
                    else if (operation === "delete") {
                        if (globalNotes) {
                            if (globalNotes[noteObj.date_id]) {
                                globalNotes[noteObj.date_id] = _.without(globalNotes[noteObj.date_id], noteObj.note);
                            }
                        }
                    }
                }
            });

            // TOPBAR
            var $topbar = $("#top-bar"),
                $appNavigation = $("#app-navigation");

            $topbar.on("click", ".dropdown", function(e) {
                var wasActive = $(this).hasClass("clicked");

                $topbar.find(".dropdown").removeClass("clicked");

                if (wasActive) {
                    $(this).removeClass("clicked");
                }
                else {
                    $(this).find(".nav-search input").val("");
                    $(this).find(".list").scrollTop(0);
                    $(this).addClass("clicked");
                    var _this = $(this);
                    setTimeout(function() {
                        _this.find(".nav-search input").focus();
                    }, 50);
                }

                e.stopPropagation();
            });

            $topbar.on("click", ".dropdown .nav-search", function(e) {
                e.stopPropagation();
            });

            $topbar.on("click", ".dropdown .item", function(e) {
                $topbar.find(".dropdown").removeClass("clicked");
                e.stopPropagation();
            });

            $("body").on("click", function() {
                $topbar.find(".dropdown").removeClass("clicked");
            });

            $("#user_api_key_item").click(function() {
                $(this).find('input').first().select();
            });

            $topbar.on("click", "#hide-sidebar-button", function() {
                var $analyticsMainView = $("#analytics-main-view");

                $analyticsMainView.find("#sidebar").toggleClass("hidden");
                $analyticsMainView.find("#content-container").toggleClass("cover-left");
            });

            // Prevent body scroll after list inside dropdown is scrolled till the end
            // Applies to any element that has prevent-body-scroll class as well
            $("body").on('DOMMouseScroll mousewheel', ".dropdown .list, .prevent-body-scroll", function(ev) {
                var $this = $(this),
                    scrollTop = this.scrollTop,
                    scrollHeight = this.scrollHeight,
                    height = $this.innerHeight(),
                    delta = ev.originalEvent.wheelDelta,
                    up = delta > 0;

                if (ev.target.className === 'item scrollable') {
                    return true;
                }

                var prevent = function() {
                    ev.stopPropagation();
                    ev.preventDefault();
                    ev.returnValue = false;
                    return false;
                };

                if (!up && -delta > scrollHeight - height - scrollTop) {
                    // Scrolling down, but this will take us past the bottom.
                    $this.scrollTop(scrollHeight);
                    return prevent();
                }
                else if (up && delta > scrollTop) {
                    // Scrolling up, but this will take us past the top.
                    $this.scrollTop(0);
                    return prevent();
                }
            });

            $appNavigation.on("click", ".item", function() {
                var appKey = $(this).data("key"),
                    appId = $(this).data("id"),
                    appName = $(this).find(".name").text(),
                    appImage = $(this).find(".app-icon").css("background-image");

                $("#active-app-icon").css("background-image", appImage);
                $("#active-app-name").text(appName);

                if (self.activeAppKey !== appKey) {
                    self.activeAppName = appName;
                    self.activeAppKey = appKey;
                    countlyCommon.setActiveApp(appId);
                    self.activeView.appChanged(function() {
                        app.onAppSwitch(appId);
                    });
                }
            });

            $appNavigation.on("click", function() {
                var appList = $(this).find(".list"),
                    apps = _.sortBy(countlyGlobal.apps, function(app) {
                        return app.name.toLowerCase();
                    });

                appList.html("");

                for (var i = 0; i < apps.length; i++) {
                    var currApp = apps[i];

                    var app = $("<div></div>");
                    app.addClass("item searchable");
                    app.data("key", currApp.key);
                    app.data("id", currApp._id);

                    var appIcon = $("<div></div>");
                    appIcon.addClass("app-icon");
                    appIcon.css("background-image", "url(" + countlyGlobal.cdn + "appimages/" + currApp._id + ".png");

                    var appName = $("<div></div>");
                    appName.addClass("name");
                    appName.attr("title", currApp.name);
                    appName.text(currApp.name);

                    app.append(appIcon);
                    app.append(appName);

                    appList.append(app);
                }
            });
        });

        if (!_.isEmpty(countlyGlobal.apps)) {
            if (!countlyCommon.ACTIVE_APP_ID) {
                var activeApp = (countlyGlobal.member && countlyGlobal.member.active_app_id && countlyGlobal.apps[countlyGlobal.member.active_app_id])
                    ? countlyGlobal.apps[countlyGlobal.member.active_app_id]
                    : countlyGlobal.defaultApp;

                countlyCommon.setActiveApp(activeApp._id);
                self.activeAppName = activeApp.name;
                $('#active-app-name').html(activeApp.name);
                $('#active-app-name').attr('title', activeApp.name);
                $("#active-app-icon").css("background-image", "url('" + countlyGlobal.cdn + "appimages/" + countlyCommon.ACTIVE_APP_ID + ".png')");
            }
            else {
                $("#active-app-icon").css("background-image", "url('" + countlyGlobal.cdn + "appimages/" + countlyCommon.ACTIVE_APP_ID + ".png')");
                $("#active-app-name").text(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name);
                self.activeAppName = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name;
            }
        }
        else {
            $("#new-install-overlay").show();
        }

        $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);

        $(document).bind("idle.idleTimer", function() {
            clearInterval(self.refreshActiveView);
        });

        $(document).bind("active.idleTimer", function() {
            self.activeView.restart();
            self.refreshActiveView = setInterval(function() {
                self.performRefresh(self);
            }, countlyCommon.DASHBOARD_REFRESH_MS);
        });

        $.fn.dataTableExt.oPagination.four_button = {
            "fnInit": function(oSettings, nPaging, fnCallbackDraw) {
                var nFirst = document.createElement('span');
                var nPrevious = document.createElement('span');
                var nNext = document.createElement('span');
                var nLast = document.createElement('span');

                nFirst.innerHTML = "<i class='fa fa-angle-double-left'></i>";
                nPrevious.innerHTML = "<i class='fa fa-angle-left'></i>";
                nNext.innerHTML = "<i class='fa fa-angle-right'></i>";
                nLast.innerHTML = "<i class='fa fa-angle-double-right'></i>";

                nFirst.className = "paginate_button first";
                nPrevious.className = "paginate_button previous";
                nNext.className = "paginate_button next";
                nLast.className = "paginate_button last";

                nPaging.appendChild(nFirst);
                nPaging.appendChild(nPrevious);
                nPaging.appendChild(nNext);
                nPaging.appendChild(nLast);

                $(nFirst).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "first");
                    fnCallbackDraw(oSettings);
                });

                $(nPrevious).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "previous");
                    fnCallbackDraw(oSettings);
                });

                $(nNext).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "next");
                    fnCallbackDraw(oSettings);
                });

                $(nLast).click(function() {
                    oSettings.oApi._fnPageChange(oSettings, "last");
                    fnCallbackDraw(oSettings);
                });

                $(nFirst).bind('selectstart', function() {
                    return false;
                });
                $(nPrevious).bind('selectstart', function() {
                    return false;
                });
                $(nNext).bind('selectstart', function() {
                    return false;
                });
                $(nLast).bind('selectstart', function() {
                    return false;
                });
            },

            "fnUpdate": function(oSettings /*,fnCallbackDraw*/) {
                if (!oSettings.aanFeatures.p) {
                    return;
                }

                var an = oSettings.aanFeatures.p;
                for (var i = 0, iLen = an.length; i < iLen; i++) {
                    var buttons = an[i].getElementsByTagName('span');
                    if (oSettings._iDisplayStart === 0) {
                        buttons[0].className = "paginate_disabled_previous";
                        buttons[1].className = "paginate_disabled_previous";
                    }
                    else {
                        buttons[0].className = "paginate_enabled_previous";
                        buttons[1].className = "paginate_enabled_previous";
                    }

                    if (oSettings.fnDisplayEnd() === oSettings.fnRecordsDisplay()) {
                        buttons[2].className = "paginate_disabled_next";
                        buttons[3].className = "paginate_disabled_next";
                    }
                    else {
                        buttons[2].className = "paginate_enabled_next";
                        buttons[3].className = "paginate_enabled_next";
                    }
                }
            }
        };

        $.fn.dataTableExt.oApi.fnStandingRedraw = function(oSettings) {
            if (oSettings.oFeatures.bServerSide === false) {
                var before = oSettings._iDisplayStart;

                oSettings.oApi._fnReDraw(oSettings);

                // iDisplayStart has been reset to zero - so lets change it back
                oSettings._iDisplayStart = before;
                oSettings.oApi._fnCalculateEnd(oSettings);
            }

            // draw the 'current' page
            oSettings.oApi._fnDraw(oSettings);
        };
        /** getCustomDateInt
        * @param {string} s - date string
        * @returns {number} number representating date
        */
        function getCustomDateInt(s) {
            s = moment(s, countlyCommon.getDateFormat(countlyCommon.periodObj.dateString)).format(countlyCommon.periodObj.dateString);
            var dateParts = "";
            if (s.indexOf(":") !== -1) {
                if (s.indexOf(",") !== -1) {
                    s = s.replace(/,|:/g, "");
                    dateParts = s.split(" ");

                    return parseInt((countlyCommon.getMonths().indexOf(dateParts[1]) + 1) * 1000000) +
                        parseInt(dateParts[0]) * 10000 +
                        parseInt(dateParts[2]);
                }
                else {
                    return parseInt(s.replace(':', ''));
                }
            }
            else if (s.length === 3) {
                return countlyCommon.getMonths().indexOf(s) + 1;
            }
            else if (s.indexOf("W") === 0) {
                s = s.replace(",", "");
                s = s.replace("W", "");
                dateParts = s.split(" ");
                return (parseInt(dateParts[0])) + parseInt(dateParts.pop() * 10000);
            }
            else {
                s = s.replace(",", "");
                dateParts = s.split(" ");

                if (dateParts.length === 3) {
                    return (parseInt(dateParts[2]) * 10000) + parseInt((countlyCommon.getMonths().indexOf(dateParts[1]) + 1) * 100) + parseInt(dateParts[0]);
                }
                else {
                    if (dateParts[0].length === 3) {
                        return parseInt((countlyCommon.getMonths().indexOf(dateParts[0]) + 1) * 100) + parseInt(dateParts[1] * 10000);
                    }
                    else {
                        return parseInt((countlyCommon.getMonths().indexOf(dateParts[1]) + 1) * 100) + parseInt(dateParts[0]);
                    }
                }
            }
        }

        jQuery.fn.dataTableExt.oSort['customDate-asc'] = function(x, y) {
            x = getCustomDateInt(x);
            y = getCustomDateInt(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['customDate-desc'] = function(x, y) {
            x = getCustomDateInt(x);
            y = getCustomDateInt(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        /** getDateRangeInt
        * @param {string} s - range string
        * @returns {number} number representing range
        */
        function getDateRangeInt(s) {
            s = s.split("-")[0];
            var mEnglish = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            if (s.indexOf(":") !== -1) {
                var mName = (s.split(" ")[1]).split(",")[0];

                return s.replace(mName, parseInt(mEnglish.indexOf(mName))).replace(/[:, ]/g, "");
            }
            else {
                var parts = s.split(" ");
                if (parts.length > 1) {
                    return parseInt(mEnglish.indexOf(parts[1]) * 100) + parseInt(parts[0]);
                }
                else {
                    return parts[0].replace(/[><]/g, "");
                }
            }
        }

        jQuery.fn.dataTableExt.oSort['dateRange-asc'] = function(x, y) {
            x = getDateRangeInt(x);
            y = getDateRangeInt(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['dateRange-desc'] = function(x, y) {
            x = getDateRangeInt(x);
            y = getDateRangeInt(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['percent-asc'] = function(x, y) {
            x = parseFloat($("<a></a>").html(x).text().replace("%", ""));
            y = parseFloat($("<a></a>").html(y).text().replace("%", ""));

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['percent-desc'] = function(x, y) {
            x = parseFloat($("<a></a>").html(x).text().replace("%", ""));
            y = parseFloat($("<a></a>").html(y).text().replace("%", ""));

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['formatted-num-asc'] = function(x, y) {
            'use strict';

            // Define vars
            var a = [], b = [];

            // Match any character except: digits (0-9), dash (-), period (.), or backslash (/) and replace those characters with empty string.
            x = x.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line
            y = y.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line

            // Handle simple fractions
            if (x.indexOf('/') >= 0) {
                a = x.split("/");
                x = parseInt(a[0], 10) / parseInt(a[1], 10);
            }
            if (y.indexOf('/') >= 0) {
                b = y.split("/");
                y = parseInt(b[0], 10) / parseInt(b[1], 10);
            }

            return x - y;
        };

        jQuery.fn.dataTableExt.oSort['formatted-num-desc'] = function(x, y) {
            'use strict';

            // Define vars
            var a = [], b = [];

            // Match any character except: digits (0-9), dash (-), period (.), or backslash (/) and replace those characters with empty string.
            x = x.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line
            y = y.replace(/[^\d\-\.\/]/g, ''); // eslint-disable-line

            // Handle simple fractions
            if (x.indexOf('/') >= 0) {
                a = x.split("/");
                x = parseInt(a[0], 10) / parseInt(a[1], 10);
            }
            if (y.indexOf('/') >= 0) {
                b = y.split("/");
                y = parseInt(b[0], 10) / parseInt(b[1], 10);
            }

            return y - x;
        };

        jQuery.fn.dataTableExt.oSort['loyalty-asc'] = function(x, y) {
            x = countlySession.getLoyaltyIndex(x);
            y = countlySession.getLoyaltyIndex(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['loyalty-desc'] = function(x, y) {
            x = countlySession.getLoyaltyIndex(x);
            y = countlySession.getLoyaltyIndex(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['frequency-asc'] = function(x, y) {
            x = countlySession.getFrequencyIndex(x);
            y = countlySession.getFrequencyIndex(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['frequency-desc'] = function(x, y) {
            x = countlySession.getFrequencyIndex(x);
            y = countlySession.getFrequencyIndex(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['session-duration-asc'] = function(x, y) {
            x = countlySession.getDurationIndex(x);
            y = countlySession.getDurationIndex(y);

            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['session-duration-desc'] = function(x, y) {
            x = countlySession.getDurationIndex(x);
            y = countlySession.getDurationIndex(y);

            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['format-ago-asc'] = function(x, y) {
            return x - y;
        };

        jQuery.fn.dataTableExt.oSort['format-ago-desc'] = function(x, y) {
            return y - x;
        };
        /** saves current page
        * @param {object} dtable  - data table
        * @param {object} settings  -data table settings
        */
        function saveCurrentPage(dtable, settings) {
            var data = dtable.fnGetData();
            countlyCommon.dtSettings = countlyCommon.dtSettings || [];

            var previosTableStatus = countlyCommon.dtSettings.filter(function(item) {
                return (item.viewId === app.activeView.cid | (item.viewId === app.activeView.cid && item.selector === settings.sTableId));
            })[0];

            if (previosTableStatus) {
                previosTableStatus.dataLength = data.length;
                previosTableStatus.page = settings._iDisplayStart / settings._iDisplayLength;
            }
            else {
                countlyCommon.dtSettings.push({
                    viewId: app.activeView.cid,
                    selector: settings.sTableId,
                    dataLength: data.length,
                    page: settings._iDisplayStart / settings._iDisplayLength
                });
            }
        }
        /** sets current page
        * @param {object} dtable  - data table
        * @param {object} settings  -data table settings
        */
        function setCurrentPage(dtable, settings) {
            var tablePersistSettings = countlyCommon.dtSettings.filter(function(item) {
                return (item.viewId === app.activeView.cid | (item.viewId === app.activeView.cid && item.selector === settings.sTableId));
            })[0];

            if (tablePersistSettings && tablePersistSettings.dataLength === dtable.fnGetData().length) {
                dtable.fnPageChange(tablePersistSettings.page);
            }
        }
        /** gets page size
        * @param {object} dtable  - data table
        * @param {object} settings  -data table settings
        * @returns {boolean} states if dtable is in active view
        */
        function getPageSize(dtable, settings) {
            var pageSizeSettings = countlyCommon.getPersistentSettings().pageSizeSettings;
            if (!pageSizeSettings) {
                pageSizeSettings = [];
            }

            var tablePersistSettings = pageSizeSettings.filter(function(item) {
                return (item.viewId === app.activeView.cid | (item.viewId === app.activeView.cid && item.selector === settings.sTableId));
            })[0];

            var pageSize;

            if (tablePersistSettings && tablePersistSettings.pageSize) {
                pageSize = tablePersistSettings.pageSize;
            }
            else if (settings.oInit && settings.oInit.iDisplayLength) {
                pageSize = settings.oInit.iDisplayLength;
            }
            else {
                pageSize = settings.iDisplayLength || settings._iDisplayLength || 50;
            }

            return pageSize;
        }

        $.extend(true, $.fn.dataTable.defaults, {
            "sDom": '<"dataTable-top"lfpT>t<"dataTable-bottom"i>',
            "bAutoWidth": false,
            "bLengthChange": true,
            "bPaginate": true,
            "sPaginationType": "four_button",
            "iDisplayLength": 50,
            "bDestroy": true,
            "bDeferRender": true,
            "oLanguage": {
                "sZeroRecords": jQuery.i18n.map["common.table.no-data"],
                "sInfoEmpty": jQuery.i18n.map["common.table.no-data"],
                "sEmptyTable": jQuery.i18n.map["common.table.no-data"],
                "sInfo": jQuery.i18n.map["common.showing"],
                "sInfoFiltered": jQuery.i18n.map["common.filtered"],
                "sSearch": jQuery.i18n.map["common.search"],
                "sLengthMenu": jQuery.i18n.map["common.show-items"] + "<input type='number' id='dataTables_length_input'/>"
            },
            "fnInitComplete": function(oSettings) {
                var dtable = this;
                var saveHTML = "<div class='save-table-data' data-help='help.datatables-export'><i class='fa fa-download'></i></div>",
                    searchHTML = "<div class='search-table-data'><i class='fa fa-search'></i></div>",
                    tableWrapper = $("#" + oSettings.sTableId + "_wrapper");

                countlyCommon.dtSettings = countlyCommon.dtSettings || [];
                tableWrapper.bind('page', function(e, _oSettings) {
                    var dataTable = $(e.target).dataTable();
                    saveCurrentPage(dataTable, _oSettings);
                });

                tableWrapper.bind('init', function(e, _oSettings) {
                    var dataTable = $(e.target).dataTable();
                    if (_oSettings.oFeatures.bServerSide) {
                        setTimeout(function() {
                            setCurrentPage(dataTable, _oSettings);
                            oSettings.isInitFinished = true;
                            tableWrapper.show();
                        }, 0);
                    }
                    else {
                        setCurrentPage(dataTable, _oSettings);
                        oSettings.isInitFinished = true;
                        tableWrapper.show();
                    }
                });

                $(saveHTML).insertBefore(tableWrapper.find(".DTTT_container"));
                $(searchHTML).insertBefore(tableWrapper.find(".dataTables_filter"));
                tableWrapper.find(".dataTables_filter").html(tableWrapper.find(".dataTables_filter").find("input").attr("Placeholder", jQuery.i18n.map["common.search"]).clone(true));

                tableWrapper.find(".search-table-data").on("click", function() {
                    $(this).next(".dataTables_filter").toggle();
                    $(this).next(".dataTables_filter").find("input").focus();
                });

                var exportDrop;
                if (oSettings.oFeatures.bServerSide) {
                    tableWrapper.find(".dataTables_length").show();
                    tableWrapper.find('#dataTables_length_input').bind('change.DT', function(/*e, _oSettings*/) {
                        //store.set("iDisplayLength", $(this).val());
                        if ($(this).val() && $(this).val().length > 0) {
                            var pageSizeSettings = countlyCommon.getPersistentSettings().pageSizeSettings;
                            if (!pageSizeSettings) {
                                pageSizeSettings = [];
                            }

                            var previosTableStatus = pageSizeSettings.filter(function(item) {
                                return (item.viewId === app.activeView.cid && item.selector === oSettings.sTableId);
                            })[0];

                            if (previosTableStatus) {
                                previosTableStatus.pageSize = parseInt($(this).val());
                            }
                            else {
                                pageSizeSettings.push({
                                    viewId: app.activeView.cid,
                                    selector: oSettings.sTableId,
                                    pageSize: parseInt($(this).val())
                                });
                            }

                            countlyCommon.setPersistentSettings({ pageSizeSettings: pageSizeSettings });
                        }
                    });
                    //slowdown serverside filtering
                    tableWrapper.find('.dataTables_filter input').unbind();
                    var timeout = null;
                    tableWrapper.find('.dataTables_filter input').bind('keyup', function() {
                        var $this = this;
                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = null;
                        }
                        timeout = setTimeout(function() {
                            oSettings.oInstance.fnFilter($this.value);
                        }, 1000);
                    });
                    var exportView = $(dtable).data("view") || "activeView";
                    var exportAPIData = app[exportView].getExportAPI ? app[exportView].getExportAPI(oSettings.sTableId) : null;
                    var exportQueryData = app[exportView].getExportQuery ? app[exportView].getExportQuery(oSettings.sTableId) : null;

                    if (exportAPIData || exportQueryData) {
                        //create export dialog
                        exportDrop = new CountlyDrop({
                            target: tableWrapper.find('.save-table-data')[0],
                            content: "",
                            position: 'right middle',
                            classes: "server-export",
                            constrainToScrollParent: false,
                            remove: true,
                            openOn: "click"
                        });
                        exportDrop.on("open", function() {
                            if (exportAPIData) {
                                $(".server-export .countly-drop-content").empty().append(CountlyHelpers.export(oSettings._iRecordsDisplay, app[exportView].getExportAPI(oSettings.sTableId), null, true).removeClass("dialog"));
                            }
                            else if (exportQueryData) {
                                $(".server-export .countly-drop-content").empty().append(CountlyHelpers.export(oSettings._iRecordsDisplay, app[exportView].getExportQuery(oSettings.sTableId)).removeClass("dialog"));
                            }
                            exportDrop.position();
                        });
                    }
                    else {
                        tableWrapper.find(".dataTables_length").hide();
                        //create export dialog
                        exportDrop = new CountlyDrop({
                            target: tableWrapper.find('.save-table-data')[0],
                            content: "",
                            position: 'right middle',
                            classes: "server-export",
                            constrainToScrollParent: false,
                            remove: true,
                            openOn: "click"
                        });
                        exportDrop.on("open", function() {
                            $(".server-export .countly-drop-content").empty().append(CountlyHelpers.tableExport(dtable, { api_key: countlyGlobal.member.api_key }, null, oSettings).removeClass("dialog"));
                            exportDrop.position();
                        });
                    }
                }
                else {
                    tableWrapper.find(".dataTables_length").hide();
                    //create export dialog
                    exportDrop = new CountlyDrop({
                        target: tableWrapper.find('.save-table-data')[0],
                        content: "",
                        position: 'right middle',
                        classes: "server-export",
                        constrainToScrollParent: false,
                        remove: true,
                        openOn: "click"
                    });

                    exportDrop.on("open", function() {
                        $(".server-export .countly-drop-content").empty().append(CountlyHelpers.tableExport(dtable, { api_key: countlyGlobal.member.api_key }).removeClass("dialog"));
                        exportDrop.position();
                    });
                }

                //tableWrapper.css({"min-height": tableWrapper.height()});
            },
            fnPreDrawCallback: function(oSettings) {
                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");

                if (oSettings.isInitFinished) {
                    tableWrapper.show();
                }
                else {
                    var dtable = $(oSettings.nTable).dataTable();
                    oSettings._iDisplayLength = getPageSize(dtable, oSettings);
                    $('.dataTables_length').find('input[type=number]').val(oSettings._iDisplayLength);
                    tableWrapper.hide();
                }

                if (tableWrapper.find(".table-placeholder").length === 0) {
                    var $placeholder = $('<div class="table-placeholder"><div class="top"></div><div class="header"></div></div>');
                    tableWrapper.append($placeholder);
                }

                if (tableWrapper.find(".table-loader").length === 0) {
                    tableWrapper.append("<div class='table-loader'></div>");
                }
            },
            fnDrawCallback: function(oSettings) {

                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
                tableWrapper.find(".dataTable-bottom").show();
                tableWrapper.find(".table-placeholder").remove();
                tableWrapper.find(".table-loader").remove();
            }
        });

        $.fn.dataTableExt.sErrMode = 'throw';
        $(document).ready(function() {
            setTimeout(function() {
                self.onAppSwitch(countlyCommon.ACTIVE_APP_ID, true, true);
            }, 1);
        });
    },
    /**
    * Localize all found html elements with data-localize and data-help-localize attributes
    * @param {jquery_object} el - jquery reference to parent element which contents to localize, by default all document is localized if not provided
    * @memberof app
    */
    localize: function(el) {
        var helpers = {
            onlyFirstUpper: function(str) {
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            },
            upper: function(str) {
                return str.toUpperCase();
            }
        };

        // translate help module
        (el ? el.find('[data-help-localize]') : $("[data-help-localize]")).each(function() {
            var elem = $(this);
            if (typeof elem.data("help-localize") !== "undefined") {
                elem.data("help", jQuery.i18n.map[elem.data("help-localize")]);
            }
        });

        // translate dashboard
        (el ? el.find('[data-localize]') : $("[data-localize]")).each(function() {
            var elem = $(this),
                toLocal = elem.data("localize").split("!"),
                localizedValue = "";

            if (toLocal.length === 2) {
                if (helpers[toLocal[0]]) {
                    localizedValue = helpers[toLocal[0]](jQuery.i18n.map[toLocal[1]]);
                }
                else {
                    localizedValue = jQuery.i18n.prop(toLocal[0], (toLocal[1]) ? jQuery.i18n.map[toLocal[1]] : "");
                }
            }
            else {
                localizedValue = jQuery.i18n.map[elem.data("localize")];
            }

            if (elem.is("input[type=text]") || elem.is("input[type=password]") || elem.is("textarea")) {
                elem.attr("placeholder", localizedValue);
            }
            else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
                elem.attr("value", localizedValue);
            }
            else {
                elem.html(localizedValue);
            }
        });
    },
    /**
    * Toggle showing tooltips, which are usually used in help mode for all elements containing css class help-zone-vs or help-zone-vb and having data-help attributes (which are generated automatically from data-help-localize attributes upon localization)
    * @param {boolean} enable - if true tooltips will be shown on hover, if false tooltips will be disabled
    * @param {jquery_object} el - jquery reference to parent element which contents to check for tooltips, by default all document is checked if not provided
    * @memberof app
    * @instance
    */
    tipsify: function(enable, el) {
        var vs = el ? el.find('.help-zone-vs') : $('.help-zone-vs'),
            vb = el ? el.find('.help-zone-vb') : $('.help-zone-vb'),
            both = el ? el.find('.help-zone-vs, .help-zone-vb') : $(".help-zone-vs, .help-zone-vb");

        vb.tipsy({
            gravity: $.fn.tipsy.autoNS,
            trigger: 'manual',
            title: function() {
                return $(this).data("help") || "";
            },
            fade: true,
            offset: 5,
            cssClass: 'yellow',
            opacity: 1,
            html: true
        });
        vs.tipsy({
            gravity: $.fn.tipsy.autoNS,
            trigger: 'manual',
            title: function() {
                return $(this).data("help") || "";
            },
            fade: true,
            offset: 5,
            cssClass: 'yellow narrow',
            opacity: 1,
            html: true
        });

        if (enable) {
            both.off('mouseenter mouseleave')
                .on('mouseenter', function() {
                    $(this).tipsy("show");
                })
                .on('mouseleave', function() {
                    $(this).tipsy("hide");
                });
        }
        else {
            both.off('mouseenter mouseleave');
        }
    },
    /**
    * Register new app type as mobile, web, desktop, etc. You can create new plugin to add new app type with its own dashboard
    * @param {string} name - name of the app type as mobile, web, desktop etc
    * @param {countlyView} view - instance of the countlyView to show as main dashboard for provided app type
    * @memberof app
    * @instance
    * @example
    * app.addAppType("mobile", MobileDashboardView);
    */
    addAppType: function(name, view) {
        this.appTypes[name] = new view();
        var menu = $("#default-type").clone();
        menu.attr("id", name + "-type");
        $("#sidebar-menu").append(menu);
    },
    /**
    * Add callback to be called when user changes app in dashboard, which can be used globally, outside of the view
    * @param {function} callback - function receives app_id param which is app id of the new app to which user switched
    * @memberof app
    * @instance
    * @example
    * app.addAppSwitchCallback(function(appId){
    *    countlyCrashes.loadList(appId);
    * });
    */
    addAppSwitchCallback: function(callback) {
        this.appSwitchCallbacks.push(callback);
    },
    /**
    * Add callback to be called when user changes app in Managment -> Applications section, useful when providing custom input additions to app editing for different app types
    * @param {function} callback - function receives app_id param which is app id and type which is app type
    * @memberof app
    * @instance
    * @example
    * app.addAppManagementSwitchCallback(function(appId, type){
    *   if (type == "mobile") {
    *       addPushHTMLIfNeeded(type);
    *       $("#view-app .appmng-push").show();
    *   } else {
    *       $("#view-app .appmng-push").hide();
    *   }
    * });
    */
    addAppManagementSwitchCallback: function(callback) {
        this.appManagementSwitchCallbacks.push(callback);
    },
    /**
    * Modify app object on app create/update before submitting it to server
    * @param {function} callback - function args object with all data that will be submitted to server on app create/update
    * @memberof app
    * @instance
    * @example
    * app.addAppObjectModificatorfunction(args){
    *   if (args.type === "mobile") {
    *       //do something for mobile
    *   }
    * });
    */
    addAppObjectModificator: function(callback) {
        this.appObjectModificators.push(callback);
    },
    /**
     * Add a countlyManagementView-extending view which will be displayed in accordion tabs on Management->Applications screen
     * @param {string} plugin - plugin name
     * @param {string} title  - plugin title
     * @param {object} View - plugin view
     */
    addAppManagementView: function(plugin, title, View) {
        this.appManagementViews[plugin] = {title: title, view: View};
    },
    /**
    * Add additional settings to app management. Allows you to inject html with css classes app-read-settings, app-write-settings and using data-id attribute for the key to store in app collection. And if your value or input needs additional processing, you may add the callbacks here
    * @param {string} id - the same value on your input data-id attributes
    * @param {object} options - different callbacks for data modification
    * @param {function} options.toDisplay - function to be called when data is prepared for displaying, pases reference to html element with app-read-settings css class in which value should be displayed
    * @param {function} options.toInput - function to be called when data is prepared for input, pases reference to html input element with app-write-settings css class in which value should be placed for editing
    * @param {function} options.toSave - function to be called when data is prepared for saving, pases reference to object args that will be sent to server ad html input element with app-write-settings css class from which value should be taken and placed in args
     * @param {function} options.toInject - function to be called when to inject HTML into app management view
    * @memberof app
    * @instance
    * @example
    * app.addAppSetting("my_setting", {
    *     toDisplay: function(appId, elem){$(elem).text(process(countlyGlobal['apps'][appId]["my_setting"]));},
    *     toInput: function(appId, elem){$(elem).val(process(countlyGlobal['apps'][appId]["my_setting"]));},
    *     toSave: function(appId, args, elem){
    *         args.my_setting = process($(elem).val());
    *     },
    *     toInject: function(){
    *         var addApp = '<tr class="help-zone-vs" data-help-localize="manage-apps.app-my_setting">'+
    *             '<td>'+
    *                 '<span data-localize="management-applications.my_setting"></span>'+
    *             '</td>'+
    *             '<td>'+
    *                 '<input type="text" value="" class="app-write-settings" data-localize="placeholder.my_setting" data-id="my_setting">'+
    *             '</td>'+
    *         '</tr>';
    *
    *         $("#add-new-app table .table-add").before(addApp);
    *
    *         var editApp = '<tr class="help-zone-vs" data-help-localize="manage-apps.app-my_settingt">'+
    *             '<td>'+
    *                 '<span data-localize="management-applications.my_setting"></span>'+
    *             '</td>'+
    *             '<td>'+
    *                 '<div class="read app-read-settings" data-id="my_setting"></div>'+
    *                 '<div class="edit">'+
    *                     '<input type="text" value="" class="app-write-settings" data-id="my_setting" data-localize="placeholder.my_setting">'+
    *                 '</div>'+
    *             '</td>'+
    *         '</tr>';
    *
    *         $(".app-details table .table-edit").before(editApp);
    *     }
    * });
    */
    addAppSetting: function(id, options) {
        this.appSettings[id] = options;
    },
    /**
    * Add callback to be called when user changes app type in UI in Managment -> Applications section (even without saving app type, just chaning in UI), useful when providing custom input additions to app editing for different app types
    * @param {function} callback - function receives type which is app type
    * @memberof app
    * @instance
    * @example
    * app.addAppAddTypeCallback(function(type){
    *   if (type == "mobile") {
    *       $("#view-app .appmng-push").show();
    *   } else {
    *       $("#view-app .appmng-push").hide();
    *   }
    * });
    */
    addAppAddTypeCallback: function(callback) {
        this.appAddTypeCallbacks.push(callback);
    },
    /**
    * Add callback to be called when user open user edit UI in Managment -> Users section (even without saving, just opening), useful when providing custom input additions to user editing
    * @param {function} callback - function receives user object and paramm which can be true if saving data, false if opening data, string to modify data
    * @memberof app
    * @instance
    */
    addUserEditCallback: function(callback) {
        this.userEditCallbacks.push(callback);
    },
    /**
    * Add custom data export handler from datatables to csv/xls exporter. Provide exporter name and callback function.
    * Then add the same name as sExport attribute to the first datatables column.
    * Then when user will want to export data from this table, your callback function will be called to get the data.
    * You must perpare array of objects all with the same keys, where keys are columns and value are table data and return it from callback
    * to be processed by exporter.
    * @param {string} name - name of the export to expect in datatables sExport attribute
    * @param {function} callback - callback to call when getting data
    * @memberof app
    * @instance
    * @example
    * app.addDataExport("userinfo", function(){
    *    var ret = [];
    *    var elem;
    *    for(var i = 0; i < tableData.length; i++){
    *        //use same keys for each array element with different user data
    *        elem ={
    *            "fullname": tableData[i].firstname + " " + tableData[i].lastname,
    *            "job": tableData[i].company + ", " + tableData[i].jobtitle,
    *            "email": tableData[i].email
    *        };
    *        ret.push(elem);
    *    }
    *    //return array
    *    return ret;
    * });
    */
    addDataExport: function(name, callback) {
        this.dataExports[name] = callback;
    },
    /**
    * Add callback to be called everytime new view/page is loaded, so you can modify view with javascript after it has been loaded
    * @param {string} view - view url/hash or with possible # as wildcard or simply providing # for any view
    * @param {function} callback - function to be called when view loaded
    * @memberof app
    * @instance
    * @example <caption>Adding to single specific view with specific url</caption>
    * //this will work only for view bind to #/analytics/events
    * app.addPageScript("/analytics/events", function(){
    *   $("#event-nav-head").after(
    *       "<a href='#/analytics/events/compare'>" +
    *           "<div id='compare-events' class='event-container'>" +
    *               "<div class='icon'></div>" +
    *               "<div class='name'>" + jQuery.i18n.map["compare.button"] + "</div>" +
    *           "</div>" +
    *       "</a>"
    *   );
    * });

    * @example <caption>Add to all view subpages</caption>
    * //this will work /users/ and users/1 and users/abs etc
    * app.addPageScript("/users#", modifyUserDetailsForPush);

    * @example <caption>Adding script to any view</caption>
    * //this will work for any view
    * app.addPageScript("#", function(){
    *   alert("I am an annoying popup appearing on each view");
    * });
    */
    addPageScript: function(view, callback) {
        if (!this.pageScripts[view]) {
            this.pageScripts[view] = [];
        }
        this.pageScripts[view].push(callback);
    },
    /**
    * Add callback to be called everytime view is refreshed, because view may reset some html, and we may want to remodify it again. By default this happens every 10 seconds, so not cpu intensive tasks
    * @param {string} view - view url/hash or with possible # as wildcard or simply providing # for any view
    * @param {function} callback - function to be called when view refreshed
    * @memberof app
    * @instance
    * @example <caption>Adding to single specific view with specific url</caption>
    * //this will work only for view bind to #/analytics/events
    * app.addPageScript("/analytics/events", function(){
    *   $("#event-nav-head").after(
    *       "<a href='#/analytics/events/compare'>" +
    *           "<div id='compare-events' class='event-container'>" +
    *               "<div class='icon'></div>" +
    *               "<div class='name'>" + jQuery.i18n.map["compare.button"] + "</div>" +
    *           "</div>" +
    *       "</a>"
    *   );
    * });

    * @example <caption>Add to all view subpage refreshed</caption>
    * //this will work /users/ and users/1 and users/abs etc
    * app.addRefreshScript("/users#", modifyUserDetailsForPush);

    * @example <caption>Adding script to any view</caption>
    * //this will work for any view
    * app.addRefreshScript("#", function(){
    *   alert("I am an annoying popup appearing on each refresh of any view");
    * });
    */
    addRefreshScript: function(view, callback) {
        if (!this.refreshScripts[view]) {
            this.refreshScripts[view] = [];
        }
        this.refreshScripts[view].push(callback);
    },
    onAppSwitch: function(appId, refresh, firstLoad) {
        if (appId !== 0) {
            this._isFirstLoad = firstLoad;
            jQuery.i18n.map = JSON.parse(app.origLang);
            if (!refresh) {
                app.main(true);
                if (window.components && window.components.slider && window.components.slider.instance) {
                    window.components.slider.instance.close();
                }
            }
            $("#sidebar-menu .sidebar-menu").hide();
            var type = countlyGlobal.apps[appId].type;
            if ($("#sidebar-menu #" + type + "-type").length) {
                $("#sidebar-menu #" + type + "-type").show();
            }
            else {
                $("#sidebar-menu #default-type").show();
            }
            for (var i = 0; i < this.appSwitchCallbacks.length; i++) {
                this.appSwitchCallbacks[i](appId);
            }
            app.localize();
        }
    },
    onAppManagementSwitch: function(appId, type) {
        for (var i = 0; i < this.appManagementSwitchCallbacks.length; i++) {
            this.appManagementSwitchCallbacks[i](appId, type || countlyGlobal.apps[appId].type);
        }
        if ($("#app-add-name").length) {
            var newAppName = $("#app-add-name").val();
            $("#app-container-new .name").text(newAppName);
            $(".new-app-name").text(newAppName);
        }
    },
    onAppAddTypeSwitch: function(type) {
        for (var i = 0; i < this.appAddTypeCallbacks.length; i++) {
            this.appAddTypeCallbacks[i](type);
        }
    },
    onUserEdit: function(user, param) {
        for (var i = 0; i < this.userEditCallbacks.length; i++) {
            param = this.userEditCallbacks[i](user, param);
        }
        return param;
    },
    pageScript: function() { //scripts to be executed on each view change
        $("#month").text(moment().year());
        $("#day").text(moment().format("MMM"));
        $("#yesterday").text(moment().subtract(1, "days").format("Do"));

        var self = this;
        $(document).ready(function() {

            var selectedDateID = countlyCommon.getPeriod();

            if (Object.prototype.toString.call(selectedDateID) !== '[object Array]') {
                $("#" + selectedDateID).addClass("active");
            }
            var i = 0;
            var l = 0;
            if (self.pageScripts[Backbone.history.fragment]) {
                for (i = 0, l = self.pageScripts[Backbone.history.fragment].length; i < l; i++) {
                    self.pageScripts[Backbone.history.fragment][i]();
                }
            }
            for (var k in self.pageScripts) {
                if (k !== '#' && k.indexOf('#') !== -1 && Backbone.history.fragment.match(k.replace(/#/g, '.*'))) {
                    for (i = 0, l = self.pageScripts[k].length; i < l; i++) {
                        self.pageScripts[k][i]();
                    }
                }
            }
            if (self.pageScripts["#"]) {
                for (i = 0, l = self.pageScripts["#"].length; i < l; i++) {
                    self.pageScripts["#"][i]();
                }
            }

            // Translate all elements with a data-help-localize or data-localize attribute
            self.localize();

            if ($("#help-toggle").hasClass("active")) {
                $('.help-zone-vb').tipsy({
                    gravity: $.fn.tipsy.autoNS,
                    trigger: 'manual',
                    title: function() {
                        return ($(this).data("help")) ? $(this).data("help") : "";
                    },
                    fade: true,
                    offset: 5,
                    cssClass: 'yellow',
                    opacity: 1,
                    html: true
                });
                $('.help-zone-vs').tipsy({
                    gravity: $.fn.tipsy.autoNS,
                    trigger: 'manual',
                    title: function() {
                        return ($(this).data("help")) ? $(this).data("help") : "";
                    },
                    fade: true,
                    offset: 5,
                    cssClass: 'yellow narrow',
                    opacity: 1,
                    html: true
                });

                $.idleTimer('destroy');
                clearInterval(self.refreshActiveView);
                $(".help-zone-vs, .help-zone-vb").hover(
                    function() {
                        $(this).tipsy("show");
                    },
                    function() {
                        $(this).tipsy("hide");
                    }
                );
            }

            $(".usparkline").peity("bar", { width: "100%", height: "30", colour: "#83C986", strokeColour: "#83C986", strokeWidth: 2 });
            $(".dsparkline").peity("bar", { width: "100%", height: "30", colour: "#DB6E6E", strokeColour: "#DB6E6E", strokeWidth: 2 });

            CountlyHelpers.setUpDateSelectors(self.activeView);

            $(window).click(function() {
                $("#date-picker").hide();
                $(".cly-select").removeClass("active");
            });

            $("#date-picker").click(function(e) {
                e.stopPropagation();
            });

            $("#date-picker-button").click(function(e) {
                $("#date-picker").toggle();

                if (self.dateToSelected) {
                    dateTo.datepicker("setDate", moment(self.dateToSelected).toDate());
                    dateFrom.datepicker("option", "maxDate", moment(self.dateToSelected).toDate());
                }
                else {
                    self.dateToSelected = moment().toDate().getTime();
                    dateTo.datepicker("setDate", moment().toDate());
                    dateFrom.datepicker("option", "maxDate", moment(self.dateToSelected).toDate());
                }

                if (self.dateFromSelected) {
                    dateFrom.datepicker("setDate", moment(self.dateFromSelected).toDate());
                    dateTo.datepicker("option", "minDate", moment(self.dateFromSelected).toDate());
                }
                else {
                    var extendDate = moment(dateTo.datepicker("getDate")).subtract(30, 'days').toDate();
                    dateFrom.datepicker("setDate", extendDate);
                    self.dateFromSelected = moment(dateTo.datepicker("getDate")).subtract(30, 'days').toDate().getTime();
                    dateTo.datepicker("option", "minDate", moment(self.dateFromSelected).toDate());
                }

                setSelectedDate();
                e.stopPropagation();
            });

            var dateTo = $("#date-to").datepicker({
                numberOfMonths: 1,
                showOtherMonths: true,
                maxDate: moment().toDate(),
                onSelect: function(selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                    if (date.getTime() < self.dateFromSelected) {
                        self.dateFromSelected = date.getTime();
                    }

                    dateFrom.datepicker("option", "maxDate", date);
                    self.dateToSelected = date.getTime();

                    setSelectedDate();
                }
            });

            var dateFrom = $("#date-from").datepicker({
                numberOfMonths: 1,
                showOtherMonths: true,
                maxDate: moment().subtract(1, 'days').toDate(),
                onSelect: function(selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                    if (date.getTime() > self.dateToSelected) {
                        self.dateToSelected = date.getTime();
                    }

                    dateTo.datepicker("option", "minDate", date);
                    self.dateFromSelected = date.getTime();

                    setSelectedDate();
                }
            });
            /** function sets selected date */
            function setSelectedDate() {
                var from = moment(dateFrom.datepicker("getDate")).format("D MMM, YYYY"),
                    to = moment(dateTo.datepicker("getDate")).format("D MMM, YYYY");

                $("#selected-date").text(from + " - " + to);
            }

            $.datepicker.setDefaults($.datepicker.regional[""]);
            $("#date-to").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
            $("#date-from").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

            $("#date-submit").click(function() {
                if (!self.dateFromSelected && !self.dateToSelected) {
                    return false;
                }

                var tzCorr = countlyCommon.getOffsetCorrectionForTimestamp(self.dateFromSelected);
                countlyCommon.setPeriod([self.dateFromSelected - tzCorr, self.dateToSelected - tzCorr]);

                self.activeView.dateChanged();
                app.runRefreshScripts();

                $(".date-selector").removeClass("selected").removeClass("active");
            });

            $('.scrollable').slimScroll({
                height: '100%',
                start: 'top',
                wheelStep: 10,
                position: 'right',
                disableFadeOut: true
            });

            $(".checkbox").on('click', function() {
                $(this).toggleClass("checked");
            });

            $(".resource-link").on('click', function() {
                if ($(this).data("link")) {
                    CountlyHelpers.openResource($(this).data("link"));
                }
            });

            $("#sidebar-menu").find(".item").each(function() {
                if ($(this).next().hasClass("sidebar-submenu") && $(this).find(".ion-chevron-right").length === 0) {
                    $(this).append("<span class='ion-chevron-right'></span>");
                }
            });

            $('.nav-search').on('input', "input", function() {
                var searchText = new RegExp($(this).val().toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')),
                    searchInside = $(this).parent().next().find(".searchable");

                searchInside.filter(function() {
                    return !(searchText.test($(this).text().toLowerCase()));
                }).css('display', 'none');

                searchInside.filter(function() {
                    return searchText.test($(this).text().toLowerCase());
                }).css('display', 'block');
            });

            $(document).on('input', "#listof-apps .search input", function() {
                var searchText = new RegExp($(this).val().toLowerCase()),
                    searchInside = $(this).parent().next().find(".searchable");

                searchInside.filter(function() {
                    return !(searchText.test($(this).text().toLowerCase()));
                }).css('display', 'none');

                searchInside.filter(function() {
                    return searchText.test($(this).text().toLowerCase());
                }).css('display', 'block');
            });

            $(document).on('mouseenter', ".bar-inner", function() {
                var number = $(this).parent().next();

                number.text($(this).data("item"));
                number.css({ "color": $(this).css("background-color") });
            });

            $(document).on('mouseleave', ".bar-inner", function() {
                var number = $(this).parent().next();

                number.text(number.data("item"));
                number.css({ "color": $(this).parent().find(".bar-inner:first-child").css("background-color") });
            });

            /*
                Auto expand left navigation (events, management > apps etc)
                if ellipsis is applied to children
             */
            var closeLeftNavExpand;
            var leftNavSelector = "#event-nav, #app-management-bar, #configs-title-bar";
            var $leftNav = $(leftNavSelector);

            $leftNav.hoverIntent({
                over: function() {
                    var parentLeftNav = $(this).parents(leftNavSelector);

                    if (leftNavNeedsExpand(parentLeftNav)) {
                        parentLeftNav.addClass("expand");
                    }
                },
                out: function() {
                    // Delay shrinking and allow movement towards the top section cancel it
                    closeLeftNavExpand = setTimeout(function() {
                        $(this).parents(leftNavSelector).removeClass("expand");
                    }, 500);
                },
                selector: ".slimScrollDiv"
            });

            $leftNav.on("mousemove", function() {
                if ($(this).hasClass("expand")) {
                    clearTimeout(closeLeftNavExpand);
                }
            });

            $leftNav.on("mouseleave", function() {
                $(this).removeClass("expand");
            });

            /** Checks if nav needs to expand
                @param {object} $nav html element
                @returns {boolean} true or false
            */
            function leftNavNeedsExpand($nav) {
                var makeExpandable = false;

                $nav.find(".event-container:not(#compare-events) .name, .app-container .name, .config-container .name").each(function(z, el) {
                    if (el.offsetWidth < el.scrollWidth) {
                        makeExpandable = true;
                        return false;
                    }
                });

                return makeExpandable;
            }
            /* End of auto expand code */
        });
    }
});

Backbone.history || (Backbone.history = new Backbone.History);
Backbone.history._checkUrl = Backbone.history.checkUrl;
Backbone.history.urlChecks = [];
Backbone.history.checkOthers = function() {
    var proceed = true;
    for (var i = 0; i < Backbone.history.urlChecks.length; i++) {
        if (!Backbone.history.urlChecks[i]()) {
            proceed = false;
        }
    }
    return proceed;
};
Backbone.history.checkUrl = function() {
    if (Backbone.history.checkOthers()) {
        Backbone.history._checkUrl();
    }
};

Backbone.history.noHistory = function(hash) {
    if (history && history.replaceState) {
        history.replaceState(undefined, undefined, hash);
    }
    else {
        location.replace(hash);
    }
};

Backbone.history.__checkUrl = Backbone.history.checkUrl;
Backbone.history._getFragment = Backbone.history.getFragment;
Backbone.history.appIds = [];
for (var i in countlyGlobal.apps) {
    Backbone.history.appIds.push(i);
}
Backbone.history.getFragment = function() {
    var fragment = Backbone.history._getFragment();
    if (fragment.indexOf("/" + countlyCommon.ACTIVE_APP_ID) === 0) {
        fragment = fragment.replace("/" + countlyCommon.ACTIVE_APP_ID, "");
    }
    return fragment;
};
Backbone.history.checkUrl = function() {
    var app_id = Backbone.history._getFragment().split("/")[1] || "";
    if (countlyCommon.APP_NAMESPACE !== false && countlyCommon.ACTIVE_APP_ID !== 0 && countlyCommon.ACTIVE_APP_ID !== app_id && Backbone.history.appIds.indexOf(app_id) === -1) {
        Backbone.history.noHistory("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history._getFragment());
        app_id = countlyCommon.ACTIVE_APP_ID;
    }

    if (countlyCommon.ACTIVE_APP_ID !== 0 && countlyCommon.ACTIVE_APP_ID !== app_id && Backbone.history.appIds.indexOf(app_id) !== -1) {
        app.switchApp(app_id, function() {
            if (Backbone.history.checkOthers()) {
                Backbone.history.__checkUrl();
            }
        });
    }
    else {
        if (Backbone.history.checkOthers()) {
            Backbone.history.__checkUrl();
        }
    }
};

//initial hash check
(function() {
    var app_id = Backbone.history._getFragment().split("/")[1] || "";
    if (countlyCommon.ACTIVE_APP_ID === app_id || Backbone.history.appIds.indexOf(app_id) !== -1) {
        //we have app id
        if (app_id !== countlyCommon.ACTIVE_APP_ID) {
            // but it is not currently selected app, so let' switch
            countlyCommon.setActiveApp(app_id);
            $("#active-app-name").text(countlyGlobal.apps[app_id].name);
            $("#active-app-icon").css("background-image", "url('" + countlyGlobal.path + "appimages/" + app_id + ".png')");
        }
    }
    else if (countlyCommon.APP_NAMESPACE !== false) {
        //add current app id
        Backbone.history.noHistory("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history._getFragment());
    }
})();

var app = new AppRouter();

/**
* Navigate to another hash address programmatically, without trigering view route and without leaving trace in history, if possible
* @param {string} hash - url path (hash part) to change
* @memberof app
* @example
* //you are at #/manage/systemlogs
* app.noHistory("#/manage/systemlogs/query/{}");
* //now pressing back would not go to #/manage/systemlogs
*/
app.noHistory = function(hash) {
    if (countlyCommon.APP_NAMESPACE !== false) {
        hash = "#/" + countlyCommon.ACTIVE_APP_ID + hash.substr(1);
    }
    if (history && history.replaceState) {
        history.replaceState(undefined, undefined, hash);
    }
    else {
        location.replace(hash);
    }
};

//collects requests for active views to dscard them if views changed
$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    //add to options for independent!!!

    if (originalOptions && (originalOptions.type === 'GET' || originalOptions.type === 'get') && originalOptions.url.substr(0, 2) === '/o') {
        if (originalOptions.data && originalOptions.data.preventGlobalAbort && originalOptions.data.preventGlobalAbort === true) {
            return true;
        }
        var myurl = "";
        var mydata = "";
        if (originalOptions && originalOptions.url) {
            myurl = originalOptions.url;
        }
        if (originalOptions && originalOptions.data) {
            mydata = JSON.stringify(originalOptions.data);
        }
        //request which is not killed on view change(only on app change)
        jqXHR.my_set_url = myurl;
        jqXHR.my_set_data = mydata;

        if (originalOptions.data && originalOptions.data.preventRequestAbort && originalOptions.data.preventRequestAbort === true) {
            if (app._myRequests[myurl] && app._myRequests[myurl][mydata]) {
                jqXHR.abort(); //we already have same working request
            }
            else {
                jqXHR.always(function(data, textStatus, jqXHR1) {
                    //if success jqxhr object is third, errored jqxhr object is in first parameter.
                    if (jqXHR1 && jqXHR1.my_set_url && jqXHR1.my_set_data) {
                        if (app._myRequests[jqXHR1.my_set_url] && app._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data]) {
                            delete app._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data];
                        }
                    }
                    else if (data && data.my_set_url && data.my_set_data) {
                        if (app._myRequests[data.my_set_url] && app._myRequests[data.my_set_url][data.my_set_data]) {
                            delete app._myRequests[data.my_set_url][data.my_set_data];
                        }

                    }
                });
                //save request in our object
                if (!app._myRequests[myurl]) {
                    app._myRequests[myurl] = {};
                }
                app._myRequests[myurl][mydata] = jqXHR;
            }
        }
        else {
            if (app.activeView) {
                if (app.activeView._myRequests[myurl] && app.activeView._myRequests[myurl][mydata]) {
                    jqXHR.abort(); //we already have same working request
                }
                else {
                    jqXHR.always(function(data, textStatus, jqXHR1) {
                        //if success jqxhr object is third, errored jqxhr object is in first parameter.
                        if (jqXHR1 && jqXHR1.my_set_url && jqXHR1.my_set_data) {
                            if (app.activeView._myRequests[jqXHR1.my_set_url] && app.activeView._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data]) {
                                delete app.activeView._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data];
                            }
                        }
                        else if (data && data.my_set_url && data.my_set_data) {
                            if (app.activeView._myRequests[data.my_set_url] && app.activeView._myRequests[data.my_set_url][data.my_set_data]) {
                                delete app.activeView._myRequests[data.my_set_url][data.my_set_data];
                            }
                        }
                    });
                    //save request in our object
                    if (!app.activeView._myRequests[myurl]) {
                        app.activeView._myRequests[myurl] = {};
                    }
                    app.activeView._myRequests[myurl][mydata] = jqXHR;
                }
            }
        }
    }
});;/* global countlyView, countlySession, countlyTotalUsers, countlyCommon, app, CountlyHelpers, countlyGlobal, store, Handlebars, countlyCity, countlyLocation, countlyDevice, countlyDeviceDetails, countlyAppVersion, countlyCarrier, _, countlyEvent, countlyTaskManager, countlyVersionHistoryManager, countlyTokenManager, SessionView, UserView, LoyaltyView, CountriesView, FrequencyView, DeviceView, PlatformView, AppVersionView, CarrierView, ResolutionView, DurationView, ManageAppsView, ManageUsersView, EventsView, DashboardView, EventsBlueprintView, EventsOverviewView, LongTaskView, DownloadView, TokenManagerView, VersionHistoryView, Backbone, pathsToSectionNames, moment, sdks, jstz, getUrls, T, jQuery, $*/
window.SessionView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {});
    },
    renderCommon: function(isRefresh) {

        var sessionData = countlySession.getSessionData(),
            sessionDP = countlySession.getSessionDP();

        this.templateData = {
            "page-title": jQuery.i18n.map["sessions.title"],
            "logo-class": "sessions",
            "big-numbers": {
                "count": 3,
                "items": [
                    {
                        "title": jQuery.i18n.map["common.total-sessions"],
                        "total": sessionData.usage["total-sessions"].total,
                        "trend": sessionData.usage["total-sessions"].trend,
                        "help": "sessions.total-sessions"
                    },
                    {
                        "title": jQuery.i18n.map["common.new-sessions"],
                        "total": sessionData.usage["new-users"].total,
                        "trend": sessionData.usage["new-users"].trend,
                        "help": "sessions.new-sessions"
                    },
                    {
                        "title": jQuery.i18n.map["common.unique-sessions"],
                        "total": sessionData.usage["total-users"].total,
                        "trend": sessionData.usage["total-users"].trend,
                        "help": "sessions.unique-sessions"
                    }
                ]
            }
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": sessionDP.chartData,
                "aoColumns": [
                    { "mData": "date", "sType": "customDate", "sTitle": jQuery.i18n.map["common.date"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.unique-sessions"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find("#big-numbers-container").html(newPage.find("#big-numbers-container").html());

            var sessionDP = countlySession.getSessionDP();
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
            CountlyHelpers.refreshTable(self.dtable, sessionDP.chartData);

            app.localize();
        });
    }
});

window.UserView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var sessionData = countlySession.getSessionData(),
            userDP = countlySession.getUserDP();

        this.templateData = {
            "page-title": jQuery.i18n.map["users.title"],
            "logo-class": "users",
            "big-numbers": {
                "count": 3,
                "items": [
                    {
                        "title": jQuery.i18n.map["common.total-users"],
                        "total": sessionData.usage["total-users"].total,
                        "trend": sessionData.usage["total-users"].trend,
                        "help": "users.total-users"
                    },
                    {
                        "title": jQuery.i18n.map["common.new-users"],
                        "total": sessionData.usage["new-users"].total,
                        "trend": sessionData.usage["new-users"].trend,
                        "help": "users.new-users"
                    },
                    {
                        "title": jQuery.i18n.map["common.returning-users"],
                        "total": sessionData.usage["returning-users"].total,
                        "trend": sessionData.usage["returning-users"].trend,
                        "help": "users.returning-users"
                    }
                ]
            }
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": userDP.chartData,
                "aoColumns": [
                    { "mData": "date", "sType": "customDate", "sTitle": jQuery.i18n.map["common.date"] },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    },
                    {
                        "mData": "returning",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.returning-users"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));

            var userDP = countlySession.getUserDP();
            countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
            CountlyHelpers.refreshTable(self.dtable, userDP.chartData);

            app.localize();
        });
    }
});

window.LoyaltyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var loyaltyData = countlySession.getRangeData("l", "l-ranges", countlySession.explainLoyaltyRange, countlySession.getLoyalityRange());

        this.templateData = {
            "page-title": jQuery.i18n.map["user-loyalty.title"],
            "logo-class": "loyalty",
            "chart-helper": "loyalty.chart",
            "table-helper": "loyalty.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": loyaltyData.chartData,
                "aoColumns": [
                    { "mData": "l", sType: "loyalty", "sTitle": jQuery.i18n.map["user-loyalty.table.session-count"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.number-of-users"]
                    },
                    { "mData": "percent", "sType": "percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(countlySession.initialize()).then(function() {
            if (app.activeView !== self) {
                return false;
            }

            var loyaltyData = countlySession.getRangeData("l", "l-ranges", countlySession.explainLoyaltyRange, countlySession.getLoyalityRange());
            countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, loyaltyData.chartData);
        });
    }
});

window.CountriesView = countlyView.extend({
    cityView: (store.get("countly_location_city")) ? store.get("countly_active_app") : false,
    initialize: function() {
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#template-analytics-countries").html());
    },
    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"},
            "map-list-users": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.users"], type: 'number', metric: "u"},
            "map-list-new": {id: 'total', label: jQuery.i18n.map["common.table.new-users"], type: 'number', metric: "n"}
        };
        return $.when(countlySession.initialize(), countlyCity.initialize(), countlyTotalUsers.initialize("countries"), countlyTotalUsers.initialize("cities"), countlyTotalUsers.initialize("users")).then(function() {});
    },
    drawTable: function() {
        var tableFirstColTitle = (this.cityView) ? jQuery.i18n.map["countries.table.city"] : jQuery.i18n.map["countries.table.country"],
            locationData,
            firstCollData = "country_flag";

        if (this.cityView) {
            locationData = countlyCity.getLocationData();
            firstCollData = "cities";
        }
        else {
            locationData = countlyLocation.getLocationData();
        }

        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": locationData,
            "aoColumns": [
                { "mData": firstCollData, "sTitle": tableFirstColTitle },
                {
                    "mData": "t",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                },
                {
                    "mData": "u",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["common.table.total-users"]
                },
                {
                    "mData": "n",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["common.table.new-users"]
                }
            ]
        }));

        $(".d-table").stickyTableHeaders();
    },
    renderCommon: function(isRefresh) {
        var sessionData = countlySession.getSessionData();

        this.templateData = {
            "page-title": jQuery.i18n.map["countries.title"],
            "logo-class": "countries",
            "big-numbers": {
                "count": 3,
                "items": [
                    {
                        "title": jQuery.i18n.map["common.total-sessions"],
                        "total": sessionData.usage["total-sessions"].total,
                        "trend": sessionData.usage["total-sessions"].trend,
                        "help": "countries.total-sessions",
                        "radio-button-id": "map-list-sessions",
                        "radio-button-class": (this.curMap === "map-list-sessions") ? "selected" : ""
                    },
                    {
                        "title": jQuery.i18n.map["common.total-users"],
                        "total": sessionData.usage["total-users"].total,
                        "trend": sessionData.usage["total-users"].trend,
                        "help": "countries.total-users",
                        "radio-button-id": "map-list-users",
                        "radio-button-class": (this.curMap === "map-list-users") ? "selected" : ""
                    },
                    {
                        "title": jQuery.i18n.map["common.new-users"],
                        "total": sessionData.usage["new-users"].total,
                        "trend": sessionData.usage["new-users"].trend,
                        "help": "countries.new-users",
                        "radio-button-id": "map-list-new",
                        "radio-button-class": (this.curMap === "map-list-new") ? "selected" : ""
                    }
                ]
            },
            "chart-helper": "countries.chart",
            "table-helper": "countries.table"
        };

        var self = this;
        $(document).unbind('selectMapCountry').bind('selectMapCountry', function() {
            $("#country-toggle").trigger("click");
        });

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            if (countlyGlobal.config.use_google) {
                if (this.cityView) {
                    countlyCity.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                }
                else {
                    countlyLocation.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                }

                $(".widget").removeClass("google-disabled");
            }
            else {
                $(".widget").addClass("google-disabled");
            }

            this.drawTable();

            if (countlyCommon.CITY_DATA === false) {
                store.set("countly_location_city", false);
            }

            $("#country-toggle").on('click', function() {
                if ($(this).hasClass("country_selected")) {
                    self.cityView = false;
                    if (countlyGlobal.config.use_google) {
                        countlyLocation.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                    }
                    $(this).removeClass("country_selected");
                    self.refresh(true);
                    store.set("countly_location_city", false);
                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
                        $(this).text(jQuery.i18n.map["common.show"] + " " + countlyLocation.getCountryName(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country));
                    }
                    else {
                        $(this).text(jQuery.i18n.map["common.show"] + " " + jQuery.i18n.map["countries.table.country"]);
                    }
                }
                else {
                    self.cityView = true;
                    if (countlyGlobal.config.use_google) {
                        countlyCity.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                    }
                    $(this).addClass("country_selected");
                    self.refresh(true);
                    store.set("countly_location_city", true);
                    $(this).html('<i class="fa fa-chevron-left" aria-hidden="true"></i>' + jQuery.i18n.map["countries.back-to-list"]);
                }
            });

            if (self.cityView) {
                $("#country-toggle").html('<i class="fa fa-chevron-left" aria-hidden="true"></i>' + jQuery.i18n.map["countries.back-to-list"]).addClass("country_selected");
            }
            else {
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
                    $("#country-toggle").text(jQuery.i18n.map["common.show"] + " " + countlyLocation.getCountryName(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country));
                }
                else {
                    $("#country-toggle").text(jQuery.i18n.map["common.show"] + " " + jQuery.i18n.map["countries.table.country"]);
                }
            }

            $(".geo-switch").on("click", ".radio", function() {
                $(".geo-switch").find(".radio").removeClass("selected");
                $(this).addClass("selected");
                self.curMap = $(this).data("id");

                if (self.cityView) {
                    countlyCity.refreshGeoChart(self.maps[self.curMap]);
                }
                else {
                    countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                }
            });
        }
    },
    refresh: function(isToggle) {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));

            if (isToggle) {
                self.drawTable();
            }
            else {
                var locationData;
                if (self.cityView) {
                    locationData = countlyCity.getLocationData();
                    if (countlyGlobal.config.use_google) {
                        countlyCity.refreshGeoChart(self.maps[self.curMap]);
                    }
                }
                else {
                    locationData = countlyLocation.getLocationData();
                    if (countlyGlobal.config.use_google) {
                        countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                    }
                }

                CountlyHelpers.refreshTable(self.dtable, locationData);
            }

            app.localize();
        });
    }
});

window.FrequencyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var frequencyData = countlySession.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange, countlySession.getFrequencyRange());

        this.templateData = {
            "page-title": jQuery.i18n.map["session-frequency.title"],
            "logo-class": "frequency",
            "chart-helper": "frequency.chart",
            "table-helper": "frequency.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": frequencyData.chartData,
                "aoColumns": [
                    { "mData": "f", sType: "frequency", "sTitle": jQuery.i18n.map["session-frequency.table.time-after"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.number-of-sessions"]
                    },
                    { "mData": "percent", "sType": "percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(countlySession.initialize()).then(function() {
            if (app.activeView !== self) {
                return false;
            }

            var frequencyData = countlySession.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange, countlySession.getFrequencyRange());
            countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, frequencyData.chartData);
        });
    }
});

window.DeviceView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDevice.initialize(), countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("devices")).then(function() {});
    },
    pageScript: function() {
        app.localize();
    },
    renderCommon: function(isRefresh) {
        var deviceData = countlyDevice.getData();

        this.templateData = {
            "page-title": jQuery.i18n.map["devices.title"],
            "logo-class": "devices",
            "graph-type-double-pie": true,
            "pie-titles": {
                "left": jQuery.i18n.map["common.total-users"],
                "right": jQuery.i18n.map["common.new-users"]
            },
            "bars": [
                {
                    "title": jQuery.i18n.map["common.bar.top-platform"],
                    "data": countlyDeviceDetails.getBarsWPercentageOfTotal("os"),
                    "help": "dashboard.top-platforms"
                },
                {
                    "title": jQuery.i18n.map["common.bar.top-platform-version"],
                    "data": countlyDeviceDetails.getBarsWPercentageOfTotal("os_versions"),
                    "help": "devices.platform-versions2"
                },
                {
                    "title": jQuery.i18n.map["common.bar.top-resolution"],
                    "data": countlyDeviceDetails.getBarsWPercentageOfTotal("resolutions"),
                    "help": "dashboard.top-resolutions"
                }
            ],
            "chart-helper": "devices.chart",
            "table-helper": ""
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.pageScript();

            countlyCommon.drawGraph(deviceData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(deviceData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": deviceData.chartData,
                "aoColumns": [
                    { "mData": "devices", "sTitle": jQuery.i18n.map["devices.table.device"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);

            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var deviceData = countlyDevice.getData();

            countlyCommon.drawGraph(deviceData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(deviceData.chartDPNew, "#dashboard-graph2", "pie");
            CountlyHelpers.refreshTable(self.dtable, deviceData.chartData);

            self.pageScript();
        });
    }
});

window.PlatformView = countlyView.extend({
    activePlatform: {},
    beforeRender: function() {
        return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("platforms"), countlyTotalUsers.initialize("platform_versions")).then(function() {});
    },
    pageScript: function() {
        app.localize();
    },
    renderCommon: function(isRefresh) {
        var self = this;
        var platformData = countlyDeviceDetails.getPlatformData();
        platformData.chartData.sort(function(a, b) {
            return (a.os_ > b.os_) ? 1 : ((b.os_ > a.os_) ? -1 : 0);
        });
        var chartHTML = "";
        var i = 0;
        if (platformData && platformData.chartDP && platformData.chartDP.dp && platformData.chartDP.dp.length) {
            chartHTML += '<div class="hsb-container top"><div class="label">Platforms</div><div class="chart"><svg id="hsb-platforms"></svg></div></div>';

            for (i = 0; i < platformData.chartDP.dp.length; i++) {
                chartHTML += '<div class="hsb-container"><div class="label">' + platformData.chartDP.dp[i].label + '</div><div class="chart"><svg id="hsb-platform' + i + '"></svg></div></div>';
            }
        }

        if (!this.activePlatform[countlyCommon.ACTIVE_APP_ID]) {
            this.activePlatform[countlyCommon.ACTIVE_APP_ID] = (platformData.chartData[0]) ? platformData.chartData[0].os_ : "";
        }

        var segments = [];
        for (i = 0; i < platformData.chartData.length; i++) {
            segments.push({name: platformData.chartData[i].os_, value: platformData.chartData[i].origos_});
        }

        this.templateData = {
            "page-title": jQuery.i18n.map["platforms.title"],
            "segment-title": jQuery.i18n.map["platforms.table.platform-version-for"],
            "logo-class": "platforms",
            "chartHTML": chartHTML,
            "isChartEmpty": (chartHTML) ? false : true,
            "chart-helper": "platform-versions.chart",
            "table-helper": "",
            "two-tables": true,
            "active-segment": this.activePlatform[countlyCommon.ACTIVE_APP_ID],
            "segmentation": segments
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.pageScript();

            this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": platformData.chartData,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).data("name", aData.origos_);
                    $(nRow).addClass("os-rows");
                },
                "aoColumns": [
                    { "mData": "os_", "sTitle": jQuery.i18n.map["platforms.table.platform"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    }
                ]
            }));

            $(".segmentation-widget .segmentation-option").on("click", function() {
                self.activePlatform[countlyCommon.ACTIVE_APP_ID] = $(this).data("value");
                self.refresh();
            });

            countlyCommon.drawHorizontalStackedBars(platformData.chartDP.dp, "#hsb-platforms");

            if (platformData && platformData.chartDP) {
                for (i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDeviceDetails.getOSSegmentedData(platformData.chartDP.dp[i].label, false, "os_versions", "platform_versions");

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform" + i, i);
                }
            }

            var oSVersionData = countlyDeviceDetails.getOSSegmentedData(this.activePlatform[countlyCommon.ACTIVE_APP_ID], false, "os_versions", "platform_versions");
            this.dtableTwo = $('#dataTableTwo').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": oSVersionData.chartData,
                "aoColumns": [
                    { "mData": "os_versions", "sTitle": jQuery.i18n.map["platforms.table.platform-version"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    }
                ]
            }));

            $("#dataTableTwo").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);

            var oSVersionData = countlyDeviceDetails.getOSSegmentedData(self.activePlatform[countlyCommon.ACTIVE_APP_ID], false, "os_versions", "platform_versions"),
                platformData = countlyDeviceDetails.getPlatformData(),
                newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find(".widget-content").replaceWith(newPage.find(".widget-content"));
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            countlyCommon.drawHorizontalStackedBars(platformData.chartDP.dp, "#hsb-platforms");

            if (platformData && platformData.chartDP) {
                for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDeviceDetails.getOSSegmentedData(platformData.chartDP.dp[i].label, false, "os_versions", "platform_versions");

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform" + i, i);
                }
            }

            CountlyHelpers.refreshTable(self.dtable, platformData.chartData);
            CountlyHelpers.refreshTable(self.dtableTwo, oSVersionData.chartData);

            self.pageScript();
        });
    }
});

window.AppVersionView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("app_versions")).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var appVersionData = countlyAppVersion.getData(false, true);
        this.templateData = {
            "page-title": jQuery.i18n.map["app-versions.title"],
            "logo-class": "app-versions",
            "chart-helper": "app-versions.chart",
            "table-helper": ""
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawGraph(appVersionData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": appVersionData.chartData,
                "aoColumns": [
                    { "mData": "app_versions", "sTitle": jQuery.i18n.map["app-versions.table.app-version"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }

            var appVersionData = countlyAppVersion.getData(false, true);
            countlyCommon.drawGraph(appVersionData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, appVersionData.chartData);
        });
    }
});

window.CarrierView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyCarrier.initialize(), countlyTotalUsers.initialize("carriers")).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var carrierData = countlyCarrier.getData();

        this.templateData = {
            "page-title": jQuery.i18n.map["carriers.title"],
            "logo-class": "carriers",
            "graph-type-double-pie": true,
            "pie-titles": {
                "left": jQuery.i18n.map["common.total-users"],
                "right": jQuery.i18n.map["common.new-users"]
            },
            "chart-helper": "carriers.chart",
            "table-helper": ""
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(carrierData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(carrierData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": carrierData.chartData,
                "aoColumns": [
                    { "mData": "carriers", "sTitle": jQuery.i18n.map["carriers.table.carrier"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }

            var carrierData = countlyCarrier.getData();
            countlyCommon.drawGraph(carrierData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(carrierData.chartDPNew, "#dashboard-graph2", "pie");
            CountlyHelpers.refreshTable(self.dtable, carrierData.chartData);
        });
    }
});

window.ResolutionView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("resolutions")).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var resolutionData = countlyDeviceDetails.getResolutionData();

        this.templateData = {
            "page-title": jQuery.i18n.map["resolutions.title"],
            "logo-class": "resolutions",
            "graph-type-double-pie": true,
            "pie-titles": {
                "left": jQuery.i18n.map["common.total-users"],
                "right": jQuery.i18n.map["common.new-users"]
            },
            "chart-helper": "resolutions.chart"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(resolutionData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(resolutionData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": resolutionData.chartData,
                "aoColumns": [
                    { "mData": "resolution", "sTitle": jQuery.i18n.map["resolutions.table.resolution"], "bSortable": false },
                    {
                        "mData": function(row) {
                            return parseInt(row.width.replace(/<(?:.|\n)*?>/gm, ''));
                        },
                        sType: "numeric",
                        "sTitle": jQuery.i18n.map["resolutions.table.width"]
                    },
                    {
                        "mData": function(row) {
                            return parseInt(row.height.replace(/<(?:.|\n)*?>/gm, ''));
                        },
                        sType: "numeric",
                        "sTitle": jQuery.i18n.map["resolutions.table.height"]
                    },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);

            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var resolutionData = countlyDeviceDetails.getResolutionData();

            countlyCommon.drawGraph(resolutionData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(resolutionData.chartDPNew, "#dashboard-graph2", "pie");
            CountlyHelpers.refreshTable(self.dtable, resolutionData.chartData);
        });
    }
});

window.DurationView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var durationData = countlySession.getRangeData("ds", "d-ranges", countlySession.explainDurationRange, countlySession.getDurationRange());

        this.templateData = {
            "page-title": jQuery.i18n.map["session-duration.title"],
            "logo-class": "durations",
            "chart-helper": "durations.chart",
            "table-helper": "durations.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": durationData.chartData,
                "aoColumns": [
                    { "mData": "ds", sType: "session-duration", "sTitle": jQuery.i18n.map["session-duration.table.duration"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.number-of-sessions"]
                    },
                    { "mData": "percent", "sType": "percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh: function() {
        var self = this;
        $.when(countlySession.initialize()).then(function() {
            if (app.activeView !== self) {
                return false;
            }

            var durationData = countlySession.getRangeData("ds", "d-ranges", countlySession.explainDurationRange, countlySession.getDurationRange());
            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, durationData.chartData);
        });
    }
});

window.ManageAppsView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#template-management-applications").html());
        this.templatePlugins = Handlebars.compile($("#template-management-plugins").html());
        this.appManagementViews = [];
    },
    beforeRender: function() {
        if (this.appManagementViews.length === 0) {
            var self = this;
            Object.keys(app.appManagementViews).forEach(function(plugin) {
                var Clas = app.appManagementViews[plugin].view,
                    view = new Clas();
                view.setAppId(countlyCommon.ACTIVE_APP_ID);
                self.appManagementViews.push(view);
            });
        }
        return $.when();
    },
    getAppCategories: function() {
        return { 1: jQuery.i18n.map["application-category.books"], 2: jQuery.i18n.map["application-category.business"], 3: jQuery.i18n.map["application-category.education"], 4: jQuery.i18n.map["application-category.entertainment"], 5: jQuery.i18n.map["application-category.finance"], 6: jQuery.i18n.map["application-category.games"], 7: jQuery.i18n.map["application-category.health-fitness"], 8: jQuery.i18n.map["application-category.lifestyle"], 9: jQuery.i18n.map["application-category.medical"], 10: jQuery.i18n.map["application-category.music"], 11: jQuery.i18n.map["application-category.navigation"], 12: jQuery.i18n.map["application-category.news"], 13: jQuery.i18n.map["application-category.photography"], 14: jQuery.i18n.map["application-category.productivity"], 15: jQuery.i18n.map["application-category.reference"], 16: jQuery.i18n.map["application-category.social-networking"], 17: jQuery.i18n.map["application-category.sports"], 18: jQuery.i18n.map["application-category.travel"], 19: jQuery.i18n.map["application-category.utilities"], 20: jQuery.i18n.map["application-category.weather"]};
    },
    getTimeZones: function() {
        return { "AF": {"n": "Afghanistan", "z": [{"(GMT+04:30) Kabul": "Asia/Kabul"}]}, "AL": {"n": "Albania", "z": [{"(GMT+01:00) Tirane": "Europe/Tirane"}]}, "DZ": {"n": "Algeria", "z": [{"(GMT+01:00) Algiers": "Africa/Algiers"}]}, "AS": {"n": "American Samoa", "z": [{"(GMT-11:00) Pago Pago": "Pacific/Pago_Pago"}]}, "AD": {"n": "Andorra", "z": [{"(GMT+01:00) Andorra": "Europe/Andorra"}]}, "AO": {"n": "Angola", "z": [{"(GMT+01:00) Luanda": "Africa/Luanda"}]}, "AI": {"n": "Anguilla", "z": [{"(GMT-04:00) Anguilla": "America/Anguilla"}]}, "AQ": {"n": "Antarctica", "z": [{"(GMT-04:00) Palmer": "Antarctica/Palmer"}, {"(GMT-03:00) Rothera": "Antarctica/Rothera"}, {"(GMT+03:00) Syowa": "Antarctica/Syowa"}, {"(GMT+05:00) Mawson": "Antarctica/Mawson"}, {"(GMT+06:00) Vostok": "Antarctica/Vostok"}, {"(GMT+07:00) Davis": "Antarctica/Davis"}, {"(GMT+08:00) Casey": "Antarctica/Casey"}, {"(GMT+10:00) Dumont D'Urville": "Antarctica/DumontDUrville"}]}, "AG": {"n": "Antigua and Barbuda", "z": [{"(GMT-04:00) Antigua": "America/Antigua"}]}, "AR": {"n": "Argentina", "z": [{"(GMT-03:00) Buenos Aires": "America/Buenos_Aires"}]}, "AM": {"n": "Armenia", "z": [{"(GMT+04:00) Yerevan": "Asia/Yerevan"}]}, "AW": {"n": "Aruba", "z": [{"(GMT-04:00) Aruba": "America/Aruba"}]}, "AU": {"n": "Australia", "z": [{"(GMT+08:00) Western Time - Perth": "Australia/Perth"}, {"(GMT+09:30) Central Time - Adelaide": "Australia/Adelaide"}, {"(GMT+09:30) Central Time - Darwin": "Australia/Darwin"}, {"(GMT+10:00) Eastern Time - Brisbane": "Australia/Brisbane"}, {"(GMT+10:00) Eastern Time - Hobart": "Australia/Hobart"}, {"(GMT+10:00) Eastern Time - Melbourne, Sydney": "Australia/Sydney"}]}, "AT": {"n": "Austria", "z": [{"(GMT+01:00) Vienna": "Europe/Vienna"}]}, "AZ": {"n": "Azerbaijan", "z": [{"(GMT+04:00) Baku": "Asia/Baku"}]}, "BS": {"n": "Bahamas", "z": [{"(GMT-05:00) Nassau": "America/Nassau"}]}, "BH": {"n": "Bahrain", "z": [{"(GMT+03:00) Bahrain": "Asia/Bahrain"}]}, "BD": {"n": "Bangladesh", "z": [{"(GMT+06:00) Dhaka": "Asia/Dhaka"}]}, "BB": {"n": "Barbados", "z": [{"(GMT-04:00) Barbados": "America/Barbados"}]}, "BY": {"n": "Belarus", "z": [{"(GMT+03:00) Minsk": "Europe/Minsk"}]}, "BE": {"n": "Belgium", "z": [{"(GMT+01:00) Brussels": "Europe/Brussels"}]}, "BZ": {"n": "Belize", "z": [{"(GMT-06:00) Belize": "America/Belize"}]}, "BJ": {"n": "Benin", "z": [{"(GMT+01:00) Porto-Novo": "Africa/Porto-Novo"}]}, "BM": {"n": "Bermuda", "z": [{"(GMT-04:00) Bermuda": "Atlantic/Bermuda"}]}, "BT": {"n": "Bhutan", "z": [{"(GMT+06:00) Thimphu": "Asia/Thimphu"}]}, "BO": {"n": "Bolivia", "z": [{"(GMT-04:00) La Paz": "America/La_Paz"}]}, "BA": {"n": "Bosnia and Herzegovina", "z": [{"(GMT+01:00) Central European Time - Belgrade": "Europe/Sarajevo"}]}, "BW": {"n": "Botswana", "z": [{"(GMT+02:00) Gaborone": "Africa/Gaborone"}]}, "BR": {"n": "Brazil", "z": [{"(GMT-04:00) Boa Vista": "America/Boa_Vista"}, {"(GMT-04:00) Campo Grande": "America/Campo_Grande"}, {"(GMT-04:00) Cuiaba": "America/Cuiaba"}, {"(GMT-04:00) Manaus": "America/Manaus"}, {"(GMT-04:00) Porto Velho": "America/Porto_Velho"}, {"(GMT-04:00) Rio Branco": "America/Rio_Branco"}, {"(GMT-03:00) Araguaina": "America/Araguaina"}, {"(GMT-03:00) Belem": "America/Belem"}, {"(GMT-03:00) Fortaleza": "America/Fortaleza"}, {"(GMT-03:00) Maceio": "America/Maceio"}, {"(GMT-03:00) Recife": "America/Recife"}, {"(GMT-03:00) Salvador": "America/Bahia"}, {"(GMT-03:00) Sao Paulo": "America/Sao_Paulo"}, {"(GMT-02:00) Noronha": "America/Noronha"}]}, "IO": {"n": "British Indian Ocean Territory", "z": [{"(GMT+06:00) Chagos": "Indian/Chagos"}]}, "VG": {"n": "British Virgin Islands", "z": [{"(GMT-04:00) Tortola": "America/Tortola"}]}, "BN": {"n": "Brunei", "z": [{"(GMT+08:00) Brunei": "Asia/Brunei"}]}, "BG": {"n": "Bulgaria", "z": [{"(GMT+02:00) Sofia": "Europe/Sofia"}]}, "BF": {"n": "Burkina Faso", "z": [{"(GMT+00:00) Ouagadougou": "Africa/Ouagadougou"}]}, "BI": {"n": "Burundi", "z": [{"(GMT+02:00) Bujumbura": "Africa/Bujumbura"}]}, "KH": {"n": "Cambodia", "z": [{"(GMT+07:00) Phnom Penh": "Asia/Phnom_Penh"}]}, "CM": {"n": "Cameroon", "z": [{"(GMT+01:00) Douala": "Africa/Douala"}]}, "CA": {"n": "Canada", "z": [{"(GMT-07:00) Mountain Time - Dawson Creek": "America/Dawson_Creek"}, {"(GMT-08:00) Pacific Time - Vancouver": "America/Vancouver"}, {"(GMT-08:00) Pacific Time - Whitehorse": "America/Whitehorse"}, {"(GMT-06:00) Central Time - Regina": "America/Regina"}, {"(GMT-07:00) Mountain Time - Edmonton": "America/Edmonton"}, {"(GMT-07:00) Mountain Time - Yellowknife": "America/Yellowknife"}, {"(GMT-06:00) Central Time - Winnipeg": "America/Winnipeg"}, {"(GMT-05:00) Eastern Time - Iqaluit": "America/Iqaluit"}, {"(GMT-05:00) Eastern Time - Montreal": "America/Montreal"}, {"(GMT-05:00) Eastern Time - Toronto": "America/Toronto"}, {"(GMT-04:00) Atlantic Time - Halifax": "America/Halifax"}, {"(GMT-03:30) Newfoundland Time - St. Johns": "America/St_Johns"}]}, "CV": {"n": "Cape Verde", "z": [{"(GMT-01:00) Cape Verde": "Atlantic/Cape_Verde"}]}, "KY": {"n": "Cayman Islands", "z": [{"(GMT-05:00) Cayman": "America/Cayman"}]}, "CF": {"n": "Central African Republic", "z": [{"(GMT+01:00) Bangui": "Africa/Bangui"}]}, "TD": {"n": "Chad", "z": [{"(GMT+01:00) Ndjamena": "Africa/Ndjamena"}]}, "CL": {"n": "Chile", "z": [{"(GMT-06:00) Easter Island": "Pacific/Easter"}, {"(GMT-04:00) Santiago": "America/Santiago"}]}, "CN": {"n": "China", "z": [{"(GMT+08:00) China Time - Beijing": "Asia/Shanghai"}]}, "CX": {"n": "Christmas Island", "z": [{"(GMT+07:00) Christmas": "Indian/Christmas"}]}, "CC": {"n": "Cocos [Keeling] Islands", "z": [{"(GMT+06:30) Cocos": "Indian/Cocos"}]}, "CO": {"n": "Colombia", "z": [{"(GMT-05:00) Bogota": "America/Bogota"}]}, "KM": {"n": "Comoros", "z": [{"(GMT+03:00) Comoro": "Indian/Comoro"}]}, "CD": {"n": "Congo [DRC]", "z": [{"(GMT+01:00) Kinshasa": "Africa/Kinshasa"}, {"(GMT+02:00) Lubumbashi": "Africa/Lubumbashi"}]}, "CG": {"n": "Congo [Republic]", "z": [{"(GMT+01:00) Brazzaville": "Africa/Brazzaville"}]}, "CK": {"n": "Cook Islands", "z": [{"(GMT-10:00) Rarotonga": "Pacific/Rarotonga"}]}, "CR": {"n": "Costa Rica", "z": [{"(GMT-06:00) Costa Rica": "America/Costa_Rica"}]}, "CI": {"n": "Côte d'Ivoire", "z": [{"(GMT+00:00) Abidjan": "Africa/Abidjan"}]}, "HR": {"n": "Croatia", "z": [{"(GMT+01:00) Central European Time - Belgrade": "Europe/Zagreb"}]}, "CU": {"n": "Cuba", "z": [{"(GMT-05:00) Havana": "America/Havana"}]}, "CW": {"n": "Curaçao", "z": [{"(GMT-04:00) Curacao": "America/Curacao"}]}, "CY": {"n": "Cyprus", "z": [{"(GMT+02:00) Nicosia": "Asia/Nicosia"}]}, "CZ": {"n": "Czech Republic", "z": [{"(GMT+01:00) Central European Time - Prague": "Europe/Prague"}]}, "DK": {"n": "Denmark", "z": [{"(GMT+01:00) Copenhagen": "Europe/Copenhagen"}]}, "DJ": {"n": "Djibouti", "z": [{"(GMT+03:00) Djibouti": "Africa/Djibouti"}]}, "DM": {"n": "Dominica", "z": [{"(GMT-04:00) Dominica": "America/Dominica"}]}, "DO": {"n": "Dominican Republic", "z": [{"(GMT-04:00) Santo Domingo": "America/Santo_Domingo"}]}, "EC": {"n": "Ecuador", "z": [{"(GMT-06:00) Galapagos": "Pacific/Galapagos"}, {"(GMT-05:00) Guayaquil": "America/Guayaquil"}]}, "EG": {"n": "Egypt", "z": [{"(GMT+02:00) Cairo": "Africa/Cairo"}]}, "SV": {"n": "El Salvador", "z": [{"(GMT-06:00) El Salvador": "America/El_Salvador"}]}, "GQ": {"n": "Equatorial Guinea", "z": [{"(GMT+01:00) Malabo": "Africa/Malabo"}]}, "ER": {"n": "Eritrea", "z": [{"(GMT+03:00) Asmera": "Africa/Asmera"}]}, "EE": {"n": "Estonia", "z": [{"(GMT+02:00) Tallinn": "Europe/Tallinn"}]}, "ET": {"n": "Ethiopia", "z": [{"(GMT+03:00) Addis Ababa": "Africa/Addis_Ababa"}]}, "FK": {"n": "Falkland Islands [Islas Malvinas]", "z": [{"(GMT-03:00) Stanley": "Atlantic/Stanley"}]}, "FO": {"n": "Faroe Islands", "z": [{"(GMT+00:00) Faeroe": "Atlantic/Faeroe"}]}, "FJ": {"n": "Fiji", "z": [{"(GMT+12:00) Fiji": "Pacific/Fiji"}]}, "FI": {"n": "Finland", "z": [{"(GMT+02:00) Helsinki": "Europe/Helsinki"}]}, "FR": {"n": "France", "z": [{"(GMT+01:00) Paris": "Europe/Paris"}]}, "GF": {"n": "French Guiana", "z": [{"(GMT-03:00) Cayenne": "America/Cayenne"}]}, "PF": {"n": "French Polynesia", "z": [{"(GMT-10:00) Tahiti": "Pacific/Tahiti"}, {"(GMT-09:30) Marquesas": "Pacific/Marquesas"}, {"(GMT-09:00) Gambier": "Pacific/Gambier"}]}, "TF": {"n": "French Southern Territories", "z": [{"(GMT+05:00) Kerguelen": "Indian/Kerguelen"}]}, "GA": {"n": "Gabon", "z": [{"(GMT+01:00) Libreville": "Africa/Libreville"}]}, "GM": {"n": "Gambia", "z": [{"(GMT+00:00) Banjul": "Africa/Banjul"}]}, "GE": {"n": "Georgia", "z": [{"(GMT+04:00) Tbilisi": "Asia/Tbilisi"}]}, "DE": {"n": "Germany", "z": [{"(GMT+01:00) Berlin": "Europe/Berlin"}]}, "GH": {"n": "Ghana", "z": [{"(GMT+00:00) Accra": "Africa/Accra"}]}, "GI": {"n": "Gibraltar", "z": [{"(GMT+01:00) Gibraltar": "Europe/Gibraltar"}]}, "GR": {"n": "Greece", "z": [{"(GMT+02:00) Athens": "Europe/Athens"}]}, "GL": {"n": "Greenland", "z": [{"(GMT-04:00) Thule": "America/Thule"}, {"(GMT-03:00) Godthab": "America/Godthab"}, {"(GMT-01:00) Scoresbysund": "America/Scoresbysund"}, {"(GMT+00:00) Danmarkshavn": "America/Danmarkshavn"}]}, "GD": {"n": "Grenada", "z": [{"(GMT-04:00) Grenada": "America/Grenada"}]}, "GP": {"n": "Guadeloupe", "z": [{"(GMT-04:00) Guadeloupe": "America/Guadeloupe"}]}, "GU": {"n": "Guam", "z": [{"(GMT+10:00) Guam": "Pacific/Guam"}]}, "GT": {"n": "Guatemala", "z": [{"(GMT-06:00) Guatemala": "America/Guatemala"}]}, "GN": {"n": "Guinea", "z": [{"(GMT+00:00) Conakry": "Africa/Conakry"}]}, "GW": {"n": "Guinea-Bissau", "z": [{"(GMT+00:00) Bissau": "Africa/Bissau"}]}, "GY": {"n": "Guyana", "z": [{"(GMT-04:00) Guyana": "America/Guyana"}]}, "HT": {"n": "Haiti", "z": [{"(GMT-05:00) Port-au-Prince": "America/Port-au-Prince"}]}, "HN": {"n": "Honduras", "z": [{"(GMT-06:00) Central Time - Tegucigalpa": "America/Tegucigalpa"}]}, "HK": {"n": "Hong Kong", "z": [{"(GMT+08:00) Hong Kong": "Asia/Hong_Kong"}]}, "HU": {"n": "Hungary", "z": [{"(GMT+01:00) Budapest": "Europe/Budapest"}]}, "IS": {"n": "Iceland", "z": [{"(GMT+00:00) Reykjavik": "Atlantic/Reykjavik"}]}, "IN": {"n": "India", "z": [{"(GMT+05:30) India Standard Time": "Asia/Calcutta"}]}, "ID": {"n": "Indonesia", "z": [{"(GMT+07:00) Jakarta": "Asia/Jakarta"}, {"(GMT+08:00) Makassar": "Asia/Makassar"}, {"(GMT+09:00) Jayapura": "Asia/Jayapura"}]}, "IR": {"n": "Iran", "z": [{"(GMT+03:30) Tehran": "Asia/Tehran"}]}, "IQ": {"n": "Iraq", "z": [{"(GMT+03:00) Baghdad": "Asia/Baghdad"}]}, "IE": {"n": "Ireland", "z": [{"(GMT+00:00) Dublin": "Europe/Dublin"}]}, "IL": {"n": "Israel", "z": [{"(GMT+02:00) Jerusalem": "Asia/Jerusalem"}]}, "IT": {"n": "Italy", "z": [{"(GMT+01:00) Rome": "Europe/Rome"}]}, "JM": {"n": "Jamaica", "z": [{"(GMT-05:00) Jamaica": "America/Jamaica"}]}, "JP": {"n": "Japan", "z": [{"(GMT+09:00) Tokyo": "Asia/Tokyo"}]}, "JO": {"n": "Jordan", "z": [{"(GMT+02:00) Amman": "Asia/Amman"}]}, "KZ": {"n": "Kazakhstan", "z": [{"(GMT+05:00) Aqtau": "Asia/Aqtau"}, {"(GMT+05:00) Aqtobe": "Asia/Aqtobe"}, {"(GMT+06:00) Almaty": "Asia/Almaty"}]}, "KE": {"n": "Kenya", "z": [{"(GMT+03:00) Nairobi": "Africa/Nairobi"}]}, "KI": {"n": "Kiribati", "z": [{"(GMT+12:00) Tarawa": "Pacific/Tarawa"}, {"(GMT+13:00) Enderbury": "Pacific/Enderbury"}, {"(GMT+14:00) Kiritimati": "Pacific/Kiritimati"}]}, "KW": {"n": "Kuwait", "z": [{"(GMT+03:00) Kuwait": "Asia/Kuwait"}]}, "KG": {"n": "Kyrgyzstan", "z": [{"(GMT+06:00) Bishkek": "Asia/Bishkek"}]}, "LA": {"n": "Laos", "z": [{"(GMT+07:00) Vientiane": "Asia/Vientiane"}]}, "LV": {"n": "Latvia", "z": [{"(GMT+02:00) Riga": "Europe/Riga"}]}, "LB": {"n": "Lebanon", "z": [{"(GMT+02:00) Beirut": "Asia/Beirut"}]}, "LS": {"n": "Lesotho", "z": [{"(GMT+02:00) Maseru": "Africa/Maseru"}]}, "LR": {"n": "Liberia", "z": [{"(GMT+00:00) Monrovia": "Africa/Monrovia"}]}, "LY": {"n": "Libya", "z": [{"(GMT+02:00) Tripoli": "Africa/Tripoli"}]}, "LI": {"n": "Liechtenstein", "z": [{"(GMT+01:00) Vaduz": "Europe/Vaduz"}]}, "LT": {"n": "Lithuania", "z": [{"(GMT+02:00) Vilnius": "Europe/Vilnius"}]}, "LU": {"n": "Luxembourg", "z": [{"(GMT+01:00) Luxembourg": "Europe/Luxembourg"}]}, "MO": {"n": "Macau", "z": [{"(GMT+08:00) Macau": "Asia/Macau"}]}, "MK": {"n": "Macedonia [FYROM]", "z": [{"(GMT+01:00) Central European Time - Belgrade": "Europe/Skopje"}]}, "MG": {"n": "Madagascar", "z": [{"(GMT+03:00) Antananarivo": "Indian/Antananarivo"}]}, "MW": {"n": "Malawi", "z": [{"(GMT+02:00) Blantyre": "Africa/Blantyre"}]}, "MY": {"n": "Malaysia", "z": [{"(GMT+08:00) Kuala Lumpur": "Asia/Kuala_Lumpur"}]}, "MV": {"n": "Maldives", "z": [{"(GMT+05:00) Maldives": "Indian/Maldives"}]}, "ML": {"n": "Mali", "z": [{"(GMT+00:00) Bamako": "Africa/Bamako"}]}, "MT": {"n": "Malta", "z": [{"(GMT+01:00) Malta": "Europe/Malta"}]}, "MH": {"n": "Marshall Islands", "z": [{"(GMT+12:00) Kwajalein": "Pacific/Kwajalein"}, {"(GMT+12:00) Majuro": "Pacific/Majuro"}]}, "MQ": {"n": "Martinique", "z": [{"(GMT-04:00) Martinique": "America/Martinique"}]}, "MR": {"n": "Mauritania", "z": [{"(GMT+00:00) Nouakchott": "Africa/Nouakchott"}]}, "MU": {"n": "Mauritius", "z": [{"(GMT+04:00) Mauritius": "Indian/Mauritius"}]}, "YT": {"n": "Mayotte", "z": [{"(GMT+03:00) Mayotte": "Indian/Mayotte"}]}, "MX": {"n": "Mexico", "z": [{"(GMT-07:00) Mountain Time - Hermosillo": "America/Hermosillo"}, {"(GMT-08:00) Pacific Time - Tijuana": "America/Tijuana"}, {"(GMT-07:00) Mountain Time - Chihuahua, Mazatlan": "America/Mazatlan"}, {"(GMT-06:00) Central Time - Mexico City": "America/Mexico_City"}]}, "FM": {"n": "Micronesia", "z": [{"(GMT+10:00) Truk": "Pacific/Truk"}, {"(GMT+11:00) Kosrae": "Pacific/Kosrae"}, {"(GMT+11:00) Ponape": "Pacific/Ponape"}]}, "MD": {"n": "Moldova", "z": [{"(GMT+02:00) Chisinau": "Europe/Chisinau"}]}, "MC": {"n": "Monaco", "z": [{"(GMT+01:00) Monaco": "Europe/Monaco"}]}, "MN": {"n": "Mongolia", "z": [{"(GMT+07:00) Hovd": "Asia/Hovd"}, {"(GMT+08:00) Choibalsan": "Asia/Choibalsan"}, {"(GMT+08:00) Ulaanbaatar": "Asia/Ulaanbaatar"}]}, "MS": {"n": "Montserrat", "z": [{"(GMT-04:00) Montserrat": "America/Montserrat"}]}, "MA": {"n": "Morocco", "z": [{"(GMT+00:00) Casablanca": "Africa/Casablanca"}]}, "MZ": {"n": "Mozambique", "z": [{"(GMT+02:00) Maputo": "Africa/Maputo"}]}, "MM": {"n": "Myanmar [Burma]", "z": [{"(GMT+06:30) Rangoon": "Asia/Rangoon"}]}, "NA": {"n": "Namibia", "z": [{"(GMT+01:00) Windhoek": "Africa/Windhoek"}]}, "NR": {"n": "Nauru", "z": [{"(GMT+12:00) Nauru": "Pacific/Nauru"}]}, "NP": {"n": "Nepal", "z": [{"(GMT+05:45) Katmandu": "Asia/Katmandu"}]}, "NL": {"n": "Netherlands", "z": [{"(GMT+01:00) Amsterdam": "Europe/Amsterdam"}]}, "NC": {"n": "New Caledonia", "z": [{"(GMT+11:00) Noumea": "Pacific/Noumea"}]}, "NZ": {"n": "New Zealand", "z": [{"(GMT+12:00) Auckland": "Pacific/Auckland"}]}, "NI": {"n": "Nicaragua", "z": [{"(GMT-06:00) Managua": "America/Managua"}]}, "NE": {"n": "Niger", "z": [{"(GMT+01:00) Niamey": "Africa/Niamey"}]}, "NG": {"n": "Nigeria", "z": [{"(GMT+01:00) Lagos": "Africa/Lagos"}]}, "NU": {"n": "Niue", "z": [{"(GMT-11:00) Niue": "Pacific/Niue"}]}, "NF": {"n": "Norfolk Island", "z": [{"(GMT+11:30) Norfolk": "Pacific/Norfolk"}]}, "KP": {"n": "North Korea", "z": [{"(GMT+09:00) Pyongyang": "Asia/Pyongyang"}]}, "MP": {"n": "Northern Mariana Islands", "z": [{"(GMT+10:00) Saipan": "Pacific/Saipan"}]}, "NO": {"n": "Norway", "z": [{"(GMT+01:00) Oslo": "Europe/Oslo"}]}, "OM": {"n": "Oman", "z": [{"(GMT+04:00) Muscat": "Asia/Muscat"}]}, "PK": {"n": "Pakistan", "z": [{"(GMT+05:00) Karachi": "Asia/Karachi"}]}, "PW": {"n": "Palau", "z": [{"(GMT+09:00) Palau": "Pacific/Palau"}]}, "PS": {"n": "Palestinian Territories", "z": [{"(GMT+02:00) Gaza": "Asia/Gaza"}]}, "PA": {"n": "Panama", "z": [{"(GMT-05:00) Panama": "America/Panama"}]}, "PG": {"n": "Papua New Guinea", "z": [{"(GMT+10:00) Port Moresby": "Pacific/Port_Moresby"}]}, "PY": {"n": "Paraguay", "z": [{"(GMT-04:00) Asuncion": "America/Asuncion"}]}, "PE": {"n": "Peru", "z": [{"(GMT-05:00) Lima": "America/Lima"}]}, "PH": {"n": "Philippines", "z": [{"(GMT+08:00) Manila": "Asia/Manila"}]}, "PN": {"n": "Pitcairn Islands", "z": [{"(GMT-08:00) Pitcairn": "Pacific/Pitcairn"}]}, "PL": {"n": "Poland", "z": [{"(GMT+01:00) Warsaw": "Europe/Warsaw"}]}, "PT": {"n": "Portugal", "z": [{"(GMT-01:00) Azores": "Atlantic/Azores"}, {"(GMT+00:00) Lisbon": "Europe/Lisbon"}]}, "PR": {"n": "Puerto Rico", "z": [{"(GMT-04:00) Puerto Rico": "America/Puerto_Rico"}]}, "QA": {"n": "Qatar", "z": [{"(GMT+03:00) Qatar": "Asia/Qatar"}]}, "RE": {"n": "Réunion", "z": [{"(GMT+04:00) Reunion": "Indian/Reunion"}]}, "RO": {"n": "Romania", "z": [{"(GMT+02:00) Bucharest": "Europe/Bucharest"}]}, "RU": {"n": "Russia", "z": [{"(GMT+03:00) Moscow-01 - Kaliningrad": "Europe/Kaliningrad"}, {"(GMT+04:00) Moscow+00": "Europe/Moscow"}, {"(GMT+04:00) Moscow+00 - Samara": "Europe/Samara"}, {"(GMT+06:00) Moscow+02 - Yekaterinburg": "Asia/Yekaterinburg"}, {"(GMT+07:00) Moscow+03 - Omsk, Novosibirsk": "Asia/Omsk"}, {"(GMT+08:00) Moscow+04 - Krasnoyarsk": "Asia/Krasnoyarsk"}, {"(GMT+09:00) Moscow+05 - Irkutsk": "Asia/Irkutsk"}, {"(GMT+10:00) Moscow+06 - Yakutsk": "Asia/Yakutsk"}, {"(GMT+11:00) Moscow+07 - Yuzhno-Sakhalinsk": "Asia/Vladivostok"}, {"(GMT+12:00) Moscow+08 - Magadan": "Asia/Magadan"}, {"(GMT+12:00) Moscow+08 - Petropavlovsk-Kamchatskiy": "Asia/Kamchatka"}]}, "RW": {"n": "Rwanda", "z": [{"(GMT+02:00) Kigali": "Africa/Kigali"}]}, "SH": {"n": "Saint Helena", "z": [{"(GMT+00:00) St Helena": "Atlantic/St_Helena"}]}, "KN": {"n": "Saint Kitts and Nevis", "z": [{"(GMT-04:00) St. Kitts": "America/St_Kitts"}]}, "LC": {"n": "Saint Lucia", "z": [{"(GMT-04:00) St. Lucia": "America/St_Lucia"}]}, "PM": {"n": "Saint Pierre and Miquelon", "z": [{"(GMT-03:00) Miquelon": "America/Miquelon"}]}, "VC": {"n": "Saint Vincent and the Grenadines", "z": [{"(GMT-04:00) St. Vincent": "America/St_Vincent"}]}, "WS": {"n": "Samoa", "z": [{"(GMT+13:00) Apia": "Pacific/Apia"}]}, "SM": {"n": "San Marino", "z": [{"(GMT+01:00) Rome": "Europe/San_Marino"}]}, "ST": {"n": "São Tomé and Príncipe", "z": [{"(GMT+00:00) Sao Tome": "Africa/Sao_Tome"}]}, "SA": {"n": "Saudi Arabia", "z": [{"(GMT+03:00) Riyadh": "Asia/Riyadh"}]}, "SN": {"n": "Senegal", "z": [{"(GMT+00:00) Dakar": "Africa/Dakar"}]}, "RS": {"n": "Serbia", "z": [{"(GMT+01:00) Central European Time - Belgrade": "Europe/Belgrade"}]}, "SC": {"n": "Seychelles", "z": [{"(GMT+04:00) Mahe": "Indian/Mahe"}]}, "SL": {"n": "Sierra Leone", "z": [{"(GMT+00:00) Freetown": "Africa/Freetown"}]}, "SG": {"n": "Singapore", "z": [{"(GMT+08:00) Singapore": "Asia/Singapore"}]}, "SK": {"n": "Slovakia", "z": [{"(GMT+01:00) Central European Time - Prague": "Europe/Bratislava"}]}, "SI": {"n": "Slovenia", "z": [{"(GMT+01:00) Central European Time - Belgrade": "Europe/Ljubljana"}]}, "SB": {"n": "Solomon Islands", "z": [{"(GMT+11:00) Guadalcanal": "Pacific/Guadalcanal"}]}, "SO": {"n": "Somalia", "z": [{"(GMT+03:00) Mogadishu": "Africa/Mogadishu"}]}, "ZA": {"n": "South Africa", "z": [{"(GMT+02:00) Johannesburg": "Africa/Johannesburg"}]}, "GS": {"n": "South Georgia and the South Sandwich Islands", "z": [{"(GMT-02:00) South Georgia": "Atlantic/South_Georgia"}]}, "KR": {"n": "South Korea", "z": [{"(GMT+09:00) Seoul": "Asia/Seoul"}]}, "ES": {"n": "Spain", "z": [{"(GMT+00:00) Canary Islands": "Atlantic/Canary"}, {"(GMT+01:00) Ceuta": "Africa/Ceuta"}, {"(GMT+01:00) Madrid": "Europe/Madrid"}]}, "LK": {"n": "Sri Lanka", "z": [{"(GMT+05:30) Colombo": "Asia/Colombo"}]}, "SD": {"n": "Sudan", "z": [{"(GMT+03:00) Khartoum": "Africa/Khartoum"}]}, "SR": {"n": "Suriname", "z": [{"(GMT-03:00) Paramaribo": "America/Paramaribo"}]}, "SJ": {"n": "Svalbard and Jan Mayen", "z": [{"(GMT+01:00) Oslo": "Arctic/Longyearbyen"}]}, "SZ": {"n": "Swaziland", "z": [{"(GMT+02:00) Mbabane": "Africa/Mbabane"}]}, "SE": {"n": "Sweden", "z": [{"(GMT+01:00) Stockholm": "Europe/Stockholm"}]}, "CH": {"n": "Switzerland", "z": [{"(GMT+01:00) Zurich": "Europe/Zurich"}]}, "SY": {"n": "Syria", "z": [{"(GMT+02:00) Damascus": "Asia/Damascus"}]}, "TW": {"n": "Taiwan", "z": [{"(GMT+08:00) Taipei": "Asia/Taipei"}]}, "TJ": {"n": "Tajikistan", "z": [{"(GMT+05:00) Dushanbe": "Asia/Dushanbe"}]}, "TZ": {"n": "Tanzania", "z": [{"(GMT+03:00) Dar es Salaam": "Africa/Dar_es_Salaam"}]}, "TH": {"n": "Thailand", "z": [{"(GMT+07:00) Bangkok": "Asia/Bangkok"}]}, "TL": {"n": "Timor-Leste", "z": [{"(GMT+09:00) Dili": "Asia/Dili"}]}, "TG": {"n": "Togo", "z": [{"(GMT+00:00) Lome": "Africa/Lome"}]}, "TK": {"n": "Tokelau", "z": [{"(GMT+14:00) Fakaofo": "Pacific/Fakaofo"}]}, "TO": {"n": "Tonga", "z": [{"(GMT+13:00) Tongatapu": "Pacific/Tongatapu"}]}, "TT": {"n": "Trinidad and Tobago", "z": [{"(GMT-04:00) Port of Spain": "America/Port_of_Spain"}]}, "TN": {"n": "Tunisia", "z": [{"(GMT+01:00) Tunis": "Africa/Tunis"}]}, "TR": {"n": "Turkey", "z": [{"(GMT+03:00) Istanbul": "Europe/Istanbul"}]}, "TM": {"n": "Turkmenistan", "z": [{"(GMT+05:00) Ashgabat": "Asia/Ashgabat"}]}, "TC": {"n": "Turks and Caicos Islands", "z": [{"(GMT-05:00) Grand Turk": "America/Grand_Turk"}]}, "TV": {"n": "Tuvalu", "z": [{"(GMT+12:00) Funafuti": "Pacific/Funafuti"}]}, "UM": {"n": "U.S. Minor Outlying Islands", "z": [{"(GMT-11:00) Midway": "Pacific/Midway"}, {"(GMT-10:00) Johnston": "Pacific/Johnston"}, {"(GMT+12:00) Wake": "Pacific/Wake"}]}, "VI": {"n": "U.S. Virgin Islands", "z": [{"(GMT-04:00) St. Thomas": "America/St_Thomas"}]}, "UG": {"n": "Uganda", "z": [{"(GMT+03:00) Kampala": "Africa/Kampala"}]}, "UA": {"n": "Ukraine", "z": [{"(GMT+02:00) Kiev": "Europe/Kiev"}]}, "AE": {"n": "United Arab Emirates", "z": [{"(GMT+04:00) Dubai": "Asia/Dubai"}]}, "GB": {"n": "United Kingdom", "z": [{"(GMT+00:00) GMT (no daylight saving)": "Etc/GMT"}, {"(GMT+00:00) London": "Europe/London"}]}, "US": {"n": "United States", "z": [{"(GMT-10:00) Hawaii Time": "Pacific/Honolulu"}, {"(GMT-09:00) Alaska Time": "America/Anchorage"}, {"(GMT-07:00) Mountain Time - Arizona": "America/Phoenix"}, {"(GMT-08:00) Pacific Time": "America/Los_Angeles"}, {"(GMT-07:00) Mountain Time": "America/Denver"}, {"(GMT-06:00) Central Time": "America/Chicago"}, {"(GMT-05:00) Eastern Time": "America/New_York"}]}, "UY": {"n": "Uruguay", "z": [{"(GMT-03:00) Montevideo": "America/Montevideo"}]}, "UZ": {"n": "Uzbekistan", "z": [{"(GMT+05:00) Tashkent": "Asia/Tashkent"}]}, "VU": {"n": "Vanuatu", "z": [{"(GMT+11:00) Efate": "Pacific/Efate"}]}, "VA": {"n": "Vatican City", "z": [{"(GMT+01:00) Rome": "Europe/Vatican"}]}, "VE": {"n": "Venezuela", "z": [{"(GMT-04:30) Caracas": "America/Caracas"}]}, "VN": {"n": "Vietnam", "z": [{"(GMT+07:00) Hanoi": "Asia/Saigon"}]}, "WF": {"n": "Wallis and Futuna", "z": [{"(GMT+12:00) Wallis": "Pacific/Wallis"}]}, "EH": {"n": "Western Sahara", "z": [{"(GMT+00:00) El Aaiun": "Africa/El_Aaiun"}]}, "YE": {"n": "Yemen", "z": [{"(GMT+03:00) Aden": "Asia/Aden"}]}, "ZM": {"n": "Zambia", "z": [{"(GMT+02:00) Lusaka": "Africa/Lusaka"}]}, "ZW": {"n": "Zimbabwe", "z": [{"(GMT+02:00) Harare": "Africa/Harare"}]} };
    },
    renderCommon: function() {
        var appTypes = {}, self = this;
        var j = 0;
        for (j in app.appTypes) {
            appTypes[j] = jQuery.i18n.map["management-applications.types." + j] || j;
        }
        $(this.el).html(this.template({
            admin_apps: countlyGlobal.admin_apps,
            app_types: appTypes
        }));

        var appCategories = this.getAppCategories();
        var timezones = this.getTimeZones();

        var appId = countlyCommon.ACTIVE_APP_ID;
        if (!countlyGlobal.admin_apps[appId]) {
            for (j in countlyGlobal.admin_apps) {
                appId = j;
                break;
            }
        }
        $("#app-management-bar .app-container").removeClass("active");
        $("#app-management-bar .app-container[data-id='" + appId + "']").addClass("active");

        $(".select-app-types").on("click", ".item", function() {
            app.onAppManagementSwitch($("#app-edit-id").val(), $(this).data("value"));
            if ($(this).parents('#add-new-app').length) {
                app.onAppAddTypeSwitch($(this).data('value'));
            }
        });

        for (j in app.appSettings) {
            if (app.appSettings[j] && app.appSettings[j].toInject) {
                app.appSettings[j].toInject();
            }
        }
        /** App management initialization function
         * @param {string} app_id - application id
         * @returns {boolean} false - if no apps
         */
        function initAppManagement(app_id) {
            if (jQuery.isEmptyObject(countlyGlobal.apps)) {
                showAdd();
                $("#no-app-warning").show();
                return false;
            }
            else if (jQuery.isEmptyObject(countlyGlobal.admin_apps)) {
                showAdd();
                return false;
            }
            else {
                hideAdd();

                if (self.appManagementViews.length === 0) {
                    Object.keys(app.appManagementViews).forEach(function(plugin) {
                        var Clas = app.appManagementViews[plugin].view,
                            view = new Clas();
                        view.setAppId(countlyCommon.ACTIVE_APP_ID);
                        self.appManagementViews.push(view);
                    });
                }

                if (countlyGlobal.admin_apps[app_id]) {
                    $("#delete-app").show();
                }
                else {
                    $("#delete-app").hide();
                }
            }

            if ($("#new-install-overlay").is(":visible")) {
                $("#no-app-warning").hide();
                //$("#first-app-success").show();
                $("#new-install-overlay").fadeOut();
                countlyCommon.setActiveApp(app_id);
                $("#active-app-icon").css("background-image", "url('" + countlyGlobal.cdn + "appimages/" + app_id + ".png')");
                $("#active-app-name").text(countlyGlobal.apps[app_id].name);
                app.onAppSwitch(app_id, true);
                app.sidebar.init();
            }
            if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
                $("#code-countly").show();
            }

            app.onAppManagementSwitch(app_id);

            $("#app-edit-id").val(app_id);
            $("#view-app").find(".widget-header .title").text(countlyGlobal.apps[app_id].name);
            $("#app-edit-name").find(".read span").text(countlyGlobal.apps[app_id].name);
            $("#app-edit-name").find(".edit input").val(countlyGlobal.apps[app_id].name);
            $("#app-edit-key").find(".read").text(countlyGlobal.apps[app_id].key);
            $("#app-edit-key").find(".edit input").val(countlyGlobal.apps[app_id].key);
            $("#app-edit-salt").find(".read").text(countlyGlobal.apps[app_id].checksum_salt || "");
            $("#app-edit-salt").find(".edit input").val(countlyGlobal.apps[app_id].checksum_salt || "");
            $("#view-app-id").text(app_id);
            $("#app-edit-type").find(".cly-select .text").text(appTypes[countlyGlobal.apps[app_id].type]);
            $("#app-edit-type").find(".cly-select .text").data("value", countlyGlobal.apps[app_id].type);
            $("#app-edit-type").find(".read").text(appTypes[countlyGlobal.apps[app_id].type]);
            $("#app-edit-category").find(".cly-select .text").text(appCategories[countlyGlobal.apps[app_id].category]);
            $("#app-edit-category").find(".cly-select .text").data("value", countlyGlobal.apps[app_id].category);
            $("#app-edit-timezone").find(".cly-select .text").data("value", countlyGlobal.apps[app_id].timezone);
            $("#app-edit-category").find(".read").text(appCategories[countlyGlobal.apps[app_id].category]);
            $("#app-edit-image").find(".read .logo").css({"background-image": 'url("' + countlyGlobal.cdn + 'appimages/' + app_id + '.png")'});
            $("#view-app .app-read-settings").each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toDisplay) {
                    app.appSettings[id].toDisplay(app_id, this);
                }
                else if (typeof countlyGlobal.apps[app_id][id] !== "undefined") {
                    $(this).text(countlyGlobal.apps[app_id][id]);
                }
            });
            $("#view-app .app-write-settings").each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toInput) {
                    app.appSettings[id].toInput(app_id, this);
                }
                else if (typeof countlyGlobal.apps[app_id][id] !== "undefined") {
                    $(this).val(countlyGlobal.apps[app_id][id]);
                }
            });
            var appTimezone = timezones[countlyGlobal.apps[app_id].country];

            for (var i = 0; i < appTimezone.z.length; i++) {
                for (var tzone in appTimezone.z[i]) {
                    if (appTimezone.z[i][tzone] === countlyGlobal.apps[app_id].timezone) {
                        var appEditTimezone = $("#app-edit-timezone").find(".read"),
                            appCountryCode = countlyGlobal.apps[app_id].country;
                        appEditTimezone.find(".flag").css({"background-image": "url(" + countlyGlobal.cdn + "images/flags/" + appCountryCode.toLowerCase() + ".png)"});
                        appEditTimezone.find(".country").text(appTimezone.n);
                        appEditTimezone.find(".timezone").text(tzone);
                        initCountrySelect("#app-edit-timezone", appCountryCode, tzone, appTimezone.z[i][tzone]);
                        break;
                    }
                }
            }

            self.el.find('.app-details-plugins').html(self.templatePlugins({
                plugins: Object.keys(app.appManagementViews).map(function(plugin, p) {
                    return {index: p, title: app.appManagementViews[plugin].title};
                })
            }));
            self.el.find('.app-details-plugins').off('remove').on('remove', function() {
                self.appManagementViews = [];
            });
            self.appManagementViews.forEach(function(view, z) {
                view.el = $(self.el.find('.app-details-plugins form')[z]);
                view.setAppId(app_id);
                $.when(view.beforeRender()).always(function() {
                    view.render(view);
                });
            });
            self.el.find('.app-details-plugins > div').accordion({active: false, collapsible: true, autoHeight: false});
            self.el.find('.app-details-plugins > div').off('accordionactivate').on('accordionactivate', function(event, ui) {
                var index = parseInt(ui.oldHeader.data('index'));
                self.appManagementViews[index].afterCollapse();
            });
            self.el.find('.app-details-plugins > div').off('accordionbeforeactivate').on('accordionbeforeactivate', function(event, ui) {
                var index = parseInt(ui.newHeader.data('index'));
                self.appManagementViews[index].beforeExpand();
            });

            /*
                Accordion needs overflow auto during animation in order to keep contents intact.
                We are adding overflow-visible class with a delay so that the dropdown elements
                can overflow outside of the container.
             */
            self.el.find(".mgmt-plugins").on("click", ".ui-accordion-header", function() {
                self.el.find(".mgmt-plugins .ui-accordion-content").removeClass("overflow-visible");

                var accordionContent = $(this).next(".ui-accordion-content");

                setTimeout(function() {
                    if (accordionContent.hasClass("ui-accordion-content-active")) {
                        accordionContent.addClass("overflow-visible");
                    }
                    else {
                        accordionContent.removeClass("overflow-visible");
                    }
                }, 300);
            });
            /** function creates users manage links 
             * @param {array} users -  list of users
             * @returns {string} - html string
            */
            function joinUsers(users) {
                var ret = "";
                if (users && users.length) {
                    for (var m = 0; m < users.length; m++) {
                        ret += "<a href='#/manage/users/" + users[m]._id + "' class='table-link-user green'>";
                        if (users[m].full_name && users[m].full_name !== "") {
                            ret += users[m].full_name;
                        }
                        else if (users[m].username && users[m].username !== "") {
                            ret += users[m].username;
                        }
                        else {
                            ret += users[m]._id;
                        }
                        ret += "</a>";
                        ret += ", ";
                    }
                    ret = ret.substring(0, ret.length - 2);
                }
                return ret;
            }
            $("#app_details").off("click").on("click", function() {
                var dialog = CountlyHelpers.loading(jQuery.i18n.map["common.loading"]);
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.r + '/details',
                    data: {
                        app_id: app_id,
                        api_key: countlyGlobal.member.api_key
                    },
                    dataType: "json",
                    success: function(result) {
                        dialog.remove();
                        if (result && result.app) {
                            var table = "<div class='title'>" + jQuery.i18n.map["management-applications.app-details"] + "</div><table class='events-table d-table' cellpadding='0' cellspacing='0'>";
                            table += "<colgroup><col width='200px'><col width='155px'><col width='100%'></colgroup>";
                            //app creator
                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-creator"] + "</td><td class='details-value' colspan='2'>" + ((result.app.owner === "" || result.app.owner_id === "") ? jQuery.i18n.map["common.unknown"] : "<a href='#/manage/users/" + result.app.owner_id + "' class='table-link-user green'>" + result.app.owner + "</a>") + "</td></tr>";
                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-created-at"] + "</td><td class='details-value' colspan='2'>" + ((parseInt(result.app.created_at) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.created_at)) + "</td></tr>";
                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-edited-at"] + "</td><td class='details-value' colspan='2'>" + ((parseInt(result.app.edited_at) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.edited_at)) + "</td></tr>";
                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-last-data"] + "</td><td class='details-value' colspan='2'>" + ((parseInt(result.app.last_data) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.last_data)) + "</td></tr>";
                            table += "<tr><td rowspan='3'>" + jQuery.i18n.map["management-applications.app-users"] + "</td>";
                            table += "<td class='second-header'>" + jQuery.i18n.map["management-applications.global_admins"] + " (" + result.global_admin.length + ")</td><td class='details-value'>" + joinUsers(result.global_admin) + "</td></tr>";
                            table += "<tr><td class='second-header'>" + jQuery.i18n.map["management-applications.admins"] + " (" + result.admin.length + ")</td><td class='details-value'>" + joinUsers(result.admin) + "</td></tr>";
                            table += "<tr><td class='second-header'>" + jQuery.i18n.map["management-applications.users"] + " (" + result.user.length + ")</td><td class='details-value'>" + joinUsers(result.user) + "</td></tr>";
                            CountlyHelpers.popup(table + "</table><div class='buttons'><div class='icon-button green btn-close'>" + jQuery.i18n.map["common.close"] + "</div></div>", "app_details_table", true);
                            $(".btn-close").off("click").on("click", function() {
                                $("#overlay").trigger('click');
                            });
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                        }
                    },
                    error: function() {
                        dialog.remove();
                        CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                    }
                });
            });
            app.localize($("#content"));
        }
        /** initializes country select
         * @param {object} parent - select parent element
         * @param {string} countryCode - country code
         * @param {string} timezoneText - timezone text
         * @param {string} timezone - timezone val
         */
        function initCountrySelect(parent, countryCode, timezoneText, timezone) {
            $(parent + " #timezone-select").hide();
            $(parent + " #selected").hide();
            $(parent + " #timezone-items").html("");
            $(parent + " #country-items").html("");

            var countrySelect = $(parent + " #country-items");
            var timezoneSelect = $(parent + " #timezone-items");

            var countryTimezones = "";
            for (var key in timezones) {
                countrySelect.append("<div data-value='" + key + "' class='item'><div class='flag' style='background-image:url(" + countlyGlobal.cdn + "images/flags/" + key.toLowerCase() + ".png)'></div>" + timezones[key].n + "</div>");
            }

            if (countryCode && timezoneText && timezone) {
                var country = timezones[countryCode];
                var prop = "";
                if (country.z.length === 1) {
                    for (prop in country.z[0]) {
                        $(parent + " #selected").show();
                        $(parent + " #selected").text(prop);
                        $(parent + " #app-timezone").val(country.z[0][prop]);
                        $(parent + " #app-country").val(countryCode);
                        $(parent + " #country-select .text").html("<div class='flag' style='background-image:url(" + countlyGlobal.cdn + "images/flags/" + countryCode.toLowerCase() + ".png)'></div>" + country.n);
                    }
                }
                else {
                    countryTimezones = country.z;

                    for (var z = 0; z < countryTimezones.length; z++) {
                        for (prop in countryTimezones[z]) {
                            timezoneSelect.append("<div data-value='" + countryTimezones[z][prop] + "' class='item'>" + prop + "</div>");
                        }
                    }

                    $(parent + " #app-timezone").val(timezone);
                    $(parent + " #app-country").val(countryCode);
                    $(parent + " #country-select .text").html("<div class='flag' style='background-image:url(" + countlyGlobal.cdn + "images/flags/" + countryCode.toLowerCase() + ".png)'></div>" + country.n);
                    $(parent + " #timezone-select .text").text(timezoneText);
                    $(parent + " #timezone-select").show();
                }

                $(parent + " .select-items .item").click(function() {
                    var selectedItem = $(this).parents(".cly-select").find(".text");
                    selectedItem.html($(this).html());
                    selectedItem.data("value", $(this).data("value"));
                });
                $(parent + " #timezone-items .item").click(function() {
                    $(parent + " #app-timezone").val($(this).data("value"));
                });
            }

            $(parent + " #country-items .item").click(function() {
                $(parent + " #selected").text("");
                $(parent + " #timezone-select").hide();
                timezoneSelect.html("");
                var attr = $(this).data("value");
                countryTimezones = timezones[attr].z;
                var prop2 = "";
                if (countryTimezones.length === 1) {
                    for (prop2 in timezones[attr].z[0]) {
                        $(parent + " #selected").show();
                        $(parent + " #selected").text(prop2);
                        $(parent + " #app-timezone").val(timezones[attr].z[0][prop2]);
                        $(parent + " #app-country").val(attr);
                    }
                }
                else {

                    var firstTz = "";

                    for (var i = 0; i < timezones[attr].z.length; i++) {
                        for (prop2 in timezones[attr].z[i]) {
                            if (i === 0) {
                                $(parent + " #timezone-select").find(".text").text(prop2);
                                firstTz = timezones[attr].z[0][prop2];
                                $(parent + " #app-country").val(attr);
                            }

                            timezoneSelect.append("<div data-value='" + timezones[attr].z[i][prop2] + "' class='item'>" + prop2 + "</div>");
                        }
                    }

                    $(parent + " #timezone-select").show();
                    $(parent + " #app-timezone").val(firstTz);
                    $(parent + " .select-items .item").click(function() {
                        var selectedItem = $(this).parents(".cly-select").find(".text");
                        selectedItem.html($(this).html());
                        selectedItem.data("value", $(this).data("value"));
                    });
                    $(parent + " #timezone-items .item").click(function() {
                        $(parent + " #app-timezone").val($(this).data("value"));
                    });
                }
            });
        }
        /** function hides edit button */
        function hideEdit() {
            $("#edit-app").removeClass("active");
            $(".edit").hide();
            $(".read").show();
            $(".table-edit").hide();
            $(".required").hide();
        }
        /** function resets add app form */
        function resetAdd() {
            $("#app-add-name").val("");
            $("#app-add-type").text(jQuery.i18n.map["management-applications.type.tip"]);
            $("#app-add-type").data("value", "");
            $("#app-add-category").text(jQuery.i18n.map["management-applications.category.tip"]);
            $("#app-add-category").data("value", "");
            $("#app-add-timezone #selected").text("");
            $("#app-add-timezone #selected").hide();
            $("#app-add-timezone .text").html(jQuery.i18n.map["management-applications.time-zone.tip"]);
            $("#app-add-timezone .text").data("value", "");
            $("#app-add-timezone #app-timezone").val("");
            $("#app-add-timezone #app-country").val("");
            $("#app-add-timezone #timezone-select").hide();
            $(".required").hide();
            if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
                $("#code-countly").show();
            }
        }
        /** function shows add app form 
         * @returns {boolean} false - if already visible
         */
        function showAdd() {
            if ($("#app-container-new").is(":visible")) {
                return false;
            }
            $(".app-container").removeClass("active");
            $("#first-app-success").hide();
            $("#code-countly").hide();
            hideEdit();
            var manageBarApp = $("#manage-new-app>div").clone();
            manageBarApp.attr("id", "app-container-new");
            manageBarApp.addClass("active");

            if (jQuery.isEmptyObject(countlyGlobal.apps)) {
                $("#cancel-app-add").hide();
                $("#manage-new-app").hide();
            }
            else {
                $("#cancel-app-add").show();
            }

            $("#app-management-bar .scrollable").append(manageBarApp);
            $("#add-new-app").show();
            $("#view-app").hide();

            var userTimezone = jstz.determine().name();

            // Set timezone selection defaults to user's current timezone
            for (var countryCode in timezones) {
                for (var i = 0; i < timezones[countryCode].z.length;i++) {
                    for (var countryTimezone in timezones[countryCode].z[i]) {
                        if (timezones[countryCode].z[i][countryTimezone] === userTimezone) {
                            initCountrySelect("#app-add-timezone", countryCode, countryTimezone, userTimezone);
                            break;
                        }
                    }
                }
            }
        }
        /** function hides add new app form and resets it */
        function hideAdd() {
            $("#app-container-new").remove();
            $("#add-new-app").hide();
            resetAdd();
            $("#view-app").show();
            if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
                $("#code-countly").show();
            }
        }

        /** initializes countly code
         * @param {string} app_id  - app id
         * @param {string} server - server address
         */
        function initCountlyCode(app_id, server) {
            if (app_id && app_id !== "" && countlyGlobal.apps[app_id]) {
                $("#code-countly .sdks").empty();
                for (var k in sdks) {
                    if (sdks[k].integration) {
                        $("#code-countly .sdks").append("<a href='http://code.count.ly/integration-" + k + ".html?server=" + server + "&app_key=" + countlyGlobal.apps[app_id].key + "' target='_blank'>" + sdks[k].name.replace("SDK", "") + "</a>");
                    }
                }
            }
        }
        if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
            $("#code-countly").show();
            var url = (location.protocol || "http:") + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/" + countlyGlobal.path;

            $.getScript(url + "sdks.js", function(/*data, textStatus, jqxhr*/) {
                var server = (location.protocol || "http:") + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/" + countlyGlobal.path;
                if (server.substr(server.length - 1) === '/') {
                    server = server.substr(0, server.length - 1);
                }
                if (typeof sdks !== "undefined" && server) {

                    initCountlyCode($("#app-edit-id").val(), server);
                    app.addAppManagementSwitchCallback(initCountlyCode);
                }
            });
        }

        initAppManagement(appId);
        initCountrySelect("#app-add-timezone");

        $("#clear-app-data").click(function() {
            if ($(this).hasClass("active")) {
                $(this).removeClass("active");
                $(".options").hide();
            }
            else {
                $(this).addClass("active");
                $(".options").show();
            }
        });

        $("#clear-data.options li").click(function() {
            $("#clear-app-data").removeClass('active');
            $(".options").hide();
            var period = $(this).attr("id").replace("clear-", "");

            var helper_msg = jQuery.i18n.map["management-applications.clear-confirm-" + period] || jQuery.i18n.map["management-applications.clear-confirm-period"];
            var helper_title = jQuery.i18n.map["management-applications.clear-" + period + "-data"] || jQuery.i18n.map["management-applications.clear-all-data"];
            var image = "clear-" + period;

            if (period === "reset") {
                image = "reset-the-app";
            }
            if (period === "all") {
                image = "clear-all-app-data";
            }
            CountlyHelpers.confirm(helper_msg, "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }

                var appId2 = $("#app-edit-id").val();

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/reset',
                    data: {
                        args: JSON.stringify({
                            app_id: appId2,
                            period: period
                        }),
                        api_key: countlyGlobal.member.api_key
                    },
                    dataType: "jsonp",
                    success: function(result1) {

                        if (!result1) {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.clear-admin"], "red");
                            return false;
                        }
                        else {
                            $(document).trigger("/i/apps/reset", { app_id: appId2, period: period });

                            if (period === "all" || period === "reset") {
                                countlySession.reset();
                                countlyLocation.reset();
                                countlyCity.reset();
                                countlyDevice.reset();
                                countlyCarrier.reset();
                                countlyDeviceDetails.reset();
                                countlyAppVersion.reset();
                                countlyEvent.reset();
                            }
                            if (period === "reset") {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.reset-success"], "black");
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.clear-success"], "black");
                            }
                        }
                    }
                });
            }, [jQuery.i18n.map["common.no-clear"], jQuery.i18n.map["management-applications.yes-clear-app"]], {title: helper_title + "?", image: image});
        });

        $("#delete-app").click(function() {
            CountlyHelpers.confirm(jQuery.i18n.map["management-applications.delete-confirm"], "popStyleGreen", function(result) {

                if (!result) {
                    return true;
                }
                var app_id = $("#app-edit-id").val();

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/delete',
                    data: {
                        args: JSON.stringify({
                            app_id: app_id
                        }),
                        api_key: countlyGlobal.member.api_key
                    },
                    dataType: "jsonp",
                    success: function() {
                        $(document).trigger("/i/apps/delete", { app_id: app_id });

                        delete countlyGlobal.apps[app_id];
                        delete countlyGlobal.admin_apps[app_id];
                        var index = Backbone.history.appIds.indexOf(app_id + "");
                        if (index > -1) {
                            Backbone.history.appIds.splice(index, 1);
                        }
                        var activeApp = $(".app-container").filter(function() {
                            return $(this).data("id") && $(this).data("id") === app_id;
                        });

                        var changeApp = (activeApp.prev().length) ? activeApp.prev() : activeApp.next();
                        initAppManagement(changeApp.data("id"));
                        activeApp.fadeOut("slow").remove();

                        if (_.isEmpty(countlyGlobal.apps)) {
                            $("#new-install-overlay").show();
                            $("#active-app-icon").css("background-image", "");
                            $("#active-app-name").text("");
                        }
                        else if (countlyCommon.ACTIVE_APP_ID === app_id) {
                            countlyCommon.setActiveApp(changeApp.data("id"));
                            $("#active-app-icon").css("background-image", "url(appimages/" + changeApp.data("id") + ".png)");
                            $("#active-app-name").text(countlyGlobal.apps[changeApp.data("id")].name);
                        }
                    },
                    error: function() {
                        CountlyHelpers.alert(jQuery.i18n.map["management-applications.delete-admin"], "red");
                    }
                });
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["management-applications.yes-delete-app"]], {title: jQuery.i18n.map["management-applications.delete-an-app"] + "?", image: "delete-an-app"});
        });

        $("#edit-app").click(function() {
            if ($(".table-edit").is(":visible")) {
                hideEdit();
            }
            else {
                $(".edit").show();
                $("#edit-app").addClass("active");
                $(".read").hide();
                $(".table-edit").show();
            }
        });

        $("#save-app-edit").click(function() {
            if ($(this).hasClass("disabled")) {
                return false;
            }

            var app_id = $("#app-edit-id").val(),
                appName = $("#app-edit-name .edit input").val(),
                current_app_key = $('#app_key_hidden').val(),
                app_key = $("#app-edit-key .edit input").val();

            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");

            if (!appName) {
                $("#app-edit-name .edit input").after(reqSpan.clone());
            }

            if (!app_key) {
                $("#app-edit-key .edit input").after(reqSpan.clone());
            }

            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            }

            var ext = $('#add-edit-image-form').find("#app_edit_image").val().split('.').pop().toLowerCase();
            if (ext && $.inArray(ext, ['gif', 'png', 'jpg', 'jpeg']) === -1) {
                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                return false;
            }

            $(this).addClass("disabled");

            var args = {
                app_id: app_id,
                name: appName,
                type: $("#app-edit-type .cly-select .text").data("value") + '',
                category: $("#app-edit-category .cly-select .text").data("value") + '',
                key: app_key,
                timezone: $("#app-edit-timezone #app-timezone").val(),
                country: $("#app-edit-timezone #app-country").val(),
                checksum_salt: $("#app-edit-salt .edit input").val()
            };

            $(".app-details .app-write-settings").each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toSave) {
                    app.appSettings[id].toSave(app_id, args, this);
                }
                else if (typeof args !== "undefined") {
                    args[id] = $(this).val();
                }
            });

            app.appObjectModificators.forEach(function(mode) {
                mode(args);
            });

            var updateApp = function() {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/update',
                    data: {
                        args: JSON.stringify(args),
                        api_key: countlyGlobal.member.api_key
                    },
                    dataType: "jsonp",
                    success: function(data) {
                        for (var modAttr in data) {
                            countlyGlobal.apps[app_id][modAttr] = data[modAttr];
                            countlyGlobal.admin_apps[app_id][modAttr] = data[modAttr];
                        }

                        if (!ext) {
                            $("#save-app-edit").removeClass("disabled");
                            initAppManagement(app_id);
                            hideEdit();
                            $(".app-container").filter(function() {
                                return $(this).data("id") && $(this).data("id") === app_id;
                            }).find(".name").text(appName);

                            var sidebarLogo = $("#active-app-icon").attr("style");
                            if (sidebarLogo.indexOf(app_id) !== -1) {
                                $("#active-app-name").text(appName);
                            }
                            return true;
                        }

                        $('#add-edit-image-form').find("#app_edit_image_id").val(app_id);
                        $('#add-edit-image-form').ajaxSubmit({
                            resetForm: true,
                            beforeSubmit: function(formData) {
                                formData.push({ name: '_csrf', value: countlyGlobal.csrf_token });
                            },
                            success: function(file) {
                                $("#save-app-edit").removeClass("disabled");
                                var updatedApp = $(".app-container").filter(function() {
                                    return $(this).data("id") && $(this).data("id") === app_id;
                                });

                                if (!file) {
                                    CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                                }
                                else {
                                    updatedApp.find(".logo").css({
                                        "background-image": "url(" + file + "?v" + (new Date().getTime()) + ")"
                                    });
                                    $("#active-app-icon").css("background-image", $("#active-app-icon").css("background-image").replace(")", "") + "?v" + (new Date().getTime()) + ")");
                                }

                                initAppManagement(app_id);
                                hideEdit();
                                updatedApp.find(".name").text(appName);
                                $("#app-edit-image").find(".logo").css({
                                    "background-image": "url(" + file + "?v" + (new Date().getTime()) + ")"
                                });
                            },
                            error: function(xhr, status, error) {
                                CountlyHelpers.alert(error, "red");
                                initAppManagement(app_id);
                                hideEdit();
                            }
                        });
                    }
                });
            };

            if (current_app_key !== app_key) {
                var warningText = jQuery.i18n.map["management-applications.app-key-change-warning"];
                if (countlyGlobal.plugins.indexOf("drill") > -1) {
                    warningText = jQuery.i18n.map["management-applications.app-key-change-warning-EE"];
                }
                CountlyHelpers.confirm(warningText, "popStyleGreen popStyleGreenWide", function(result) {
                    if (result) {
                        updateApp();
                    }
                    else {
                        $("#save-app-edit").removeClass("disabled");
                    }
                }, [jQuery.i18n.map["common.no-dont-change"], jQuery.i18n.map["management-applications.app-key-change-warning-confirm"]], {title: jQuery.i18n.map["management-applications.app-key-change-warning-title"], image: "change-the-app-key"});
            }
            else {
                updateApp();
            }
        });

        $("#cancel-app-edit").click(function() {
            hideEdit();
            var appId2 = $("#app-edit-id").val();
            initAppManagement(appId2);
        });

        $("#management-app-container .app-container:not(#app-container-new)").live("click", function() {
            var appId2 = $(this).data("id");
            hideEdit();
            $(".app-container").removeClass("active");
            $(this).addClass("active");
            initAppManagement(appId2);
        });

        $("#add-app-button").click(function() {
            showAdd();
        });

        $("#cancel-app-add").click(function() {
            $("#app-container-new").remove();
            $("#add-new-app").hide();
            $("#view-app").show();
            $(".new-app-name").text(jQuery.i18n.map["management-applications.my-new-app"]);
            resetAdd();
        });

        $("#app-add-name").keyup(function() {
            var newAppName = $(this).val();
            $("#app-container-new .name").text(newAppName);
            $(".new-app-name").text(newAppName);
        });

        $("#save-app-add").click(function() {

            if ($(this).hasClass("disabled")) {
                return false;
            }

            var appName = $("#app-add-name").val(),
                type = $("#app-add-type").data("value") + "",
                category = $("#app-add-category").data("value") + "",
                timezone = $("#app-add-timezone #app-timezone").val(),
                country = $("#app-add-timezone #app-country").val();

            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");

            if (!appName) {
                $("#app-add-name").after(reqSpan.clone());
            }

            if (!type) {
                $("#app-add-type").parents(".cly-select").after(reqSpan.clone());
            }

            /*if (!category) {
                $("#app-add-category").parents(".cly-select").after(reqSpan.clone());
            }*/

            if (!timezone) {
                $("#app-add-timezone #app-timezone").after(reqSpan.clone());
            }

            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            }

            var ext = $('#add-app-image-form').find("#app_add_image").val().split('.').pop().toLowerCase();
            if (ext && $.inArray(ext, ['gif', 'png', 'jpg', 'jpeg']) === -1) {
                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                return false;
            }

            $(this).addClass("disabled");

            var args = {
                name: appName,
                type: type,
                category: category,
                timezone: timezone,
                country: country
            };

            $("#add-new-app .app-write-settings").each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toSave) {
                    app.appSettings[id].toSave(null, args, this);
                }
                else if (typeof args !== "undefined") {
                    args[id] = $(this).val();
                }
            });

            app.appObjectModificators.forEach(function(mode) {
                mode(args);
            });

            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.apps.w + '/create',
                data: {
                    args: JSON.stringify(args),
                    api_key: countlyGlobal.member.api_key
                },
                dataType: "jsonp",
                success: function(data) {

                    var sidebarApp = $("#sidebar-new-app>div").clone();

                    countlyGlobal.apps[data._id] = data;
                    countlyGlobal.admin_apps[data._id] = data;
                    Backbone.history.appIds.push(data._id + "");

                    var newApp = $("#app-container-new");
                    newApp.data("id", data._id);
                    newApp.data("key", data.key);
                    newApp.find(".name").data("localize", "");
                    newApp.find(".name").text(data.name);
                    newApp.removeAttr("id");

                    if (!ext) {
                        $("#save-app-add").removeClass("disabled");
                        sidebarApp.find(".name").text(data.name);
                        sidebarApp.data("id", data._id);
                        sidebarApp.data("key", data.key);
                        newApp.find(".logo").css({
                            "background-image": "url(appimages/" + data._id + ".png)"
                        });

                        $("#app-nav .apps-scrollable").append(sidebarApp);
                        initAppManagement(data._id);
                        return true;
                    }

                    $('#add-app-image-form').find("#app_add_image_id").val(data._id);
                    $('#add-app-image-form').ajaxSubmit({
                        resetForm: true,
                        beforeSubmit: function(formData) {
                            formData.push({ name: '_csrf', value: countlyGlobal.csrf_token });
                        },
                        success: function(file) {
                            $("#save-app-add").removeClass("disabled");

                            if (!file) {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                            }
                            else {
                                newApp.find(".logo").css({
                                    "background-image": "url(" + file + ")"
                                });
                                sidebarApp.find(".logo").css({
                                    "background-image": "url(" + file + ")"
                                });
                            }

                            sidebarApp.find(".name").text(data.name);
                            sidebarApp.data("id", data._id);
                            sidebarApp.data("key", data.key);

                            $("#app-nav .apps-scrollable").append(sidebarApp);
                            initAppManagement(data._id);
                        }
                    });
                }
            });
        });

    }
});

window.ManageUsersView = countlyView.extend({
    /*
        Listen for;
            user-mgmt.user-created : On new user created. Param : new user form model.
            user-mgmt.user-updated : On user updated. Param: user form model.
            user-mgmt.user-deleted : On user deleted. Param: userid
            user-mgmt.user-selected : On user selected. Param : user.
            user-mgmt.new-user-button-clicked : On new user button clicked.

            Ex:
                $(app.manageUsersView).on('user-mgmt.user-selected', function(e, user) { console.log(user) });

        Triggers for;
            user-mgmt.render: To render usertable from outside.
            
            Ex: 
                $(app.manageUsersView).trigger('user-mgmt.render');
    */
    template: null,
    initialize: function() {
        var self = this;
        T.render('templates/users', function(t) {
            self.template = t;
        });
    },
    beforeRender: function() {
        if (this.template) {
            return true;
        }
        else {
            var self = this;
            return $.when($.get(countlyGlobal.path + '/templates/users.html', function(src) {
                self.template = Handlebars.compile(src);
            })).then(function() {});
        }
    },
    renderTable: function(users) {
        var self = this;
        $('#content').html(self.template({
            "page-title": jQuery.i18n.map["sidebar.management.users"],
            users: users,
            apps: countlyGlobal.apps,
            is_global_admin: (countlyGlobal.member.global_admin) ? true : false
        }));
        var tableData = [];
        if (users) {
            for (var z in users) {
                tableData.push(users[z]);
            }
        }
        self.dtable = $('#user-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": tableData,
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData._id);
            },
            "aoColumns": [
                CountlyHelpers.expandRowIconColumn(),
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return "<span title='" + row.full_name + "'>" + row.full_name + "</span>";
                        }
                        else {
                            return row.full_name;
                        }
                    },
                    "sType": "string",
                    "sExport": "userinfo",
                    "sTitle": jQuery.i18n.map["management-users.full-name"],
                    "sClass": "trim"
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return "<span title='" + row.username + "'>" + row.username + "</span>";
                        }
                        else {
                            return row.username;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["management-users.username"],
                    "sClass": "trim"
                },
                {
                    "mData": function(row) {
                        if (row.global_admin) {
                            return jQuery.i18n.map["management-users.global-admin"];
                        }
                        else if (row.admin_of && row.admin_of.length) {
                            return jQuery.i18n.map["management-users.admin"];
                        }
                        else if (row.user_of && row.user_of.length) {
                            return jQuery.i18n.map["management-users.user"];
                        }
                        else {
                            return jQuery.i18n.map["management-users.no-role"];
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["management-users.role"]
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return "<span title='" + row.email + "'>" + row.email + "</span>";
                        }
                        else {
                            return row.email;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["management-users.email"],
                    "sClass": "trim"
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return (row.created_at) ? countlyCommon.formatTimeAgo(row.created_at) : "";
                        }
                        else {
                            return (row.created_at) ? row.created_at : 0;
                        }
                    },
                    "sType": "format-ago",
                    "sTitle": jQuery.i18n.map["management-users.created"]
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return (row.last_login) ? countlyCommon.formatTimeAgo(row.last_login) : jQuery.i18n.map["common.never"];
                        }
                        else {
                            return (row.last_login) ? row.last_login : 0;
                        }
                    },
                    "sType": "format-ago",
                    "sTitle": jQuery.i18n.map["management-users.last_login"]
                }
            ]
        }));
        self.dtable.fnSort([ [0, 'asc'] ]);
        self.dtable.stickyTableHeaders();
        CountlyHelpers.expandRows(self.dtable, self.editUser, self);
        app.addDataExport("userinfo", function() {
            var ret = [];
            var elem;
            for (var i = 0; i < tableData.length; i++) {
                elem = {};
                elem[jQuery.i18n.map["management-users.full-name"]] = tableData[i].full_name;
                elem[jQuery.i18n.map["management-users.username"]] = tableData[i].username;
                elem[jQuery.i18n.map["management-users.email"]] = tableData[i].email;
                elem[jQuery.i18n.map["management-users.global-admin"]] = tableData[i].global_admin;
                elem[jQuery.i18n.map["management-users.lock-account"]] = tableData[i].locked;

                if (tableData[i].created_at === 0) {
                    elem[jQuery.i18n.map["management-users.created"]] = jQuery.i18n.map["common.unknown"];
                }
                else {
                    elem[jQuery.i18n.map["management-users.created"]] = moment(parseInt(tableData[i].created_at) * 1000).format("ddd, D MMM YYYY HH:mm:ss");
                }

                if (tableData[i].last_login === 0) {
                    elem[jQuery.i18n.map["management-users.last_login"]] = jQuery.i18n.map["common.unknown"];
                }
                else {
                    elem[jQuery.i18n.map["management-users.last_login"]] = moment(parseInt(tableData[i].last_login) * 1000).format("ddd, D MMM YYYY HH:mm:ss");
                }

                if (tableData[i].admin_of && tableData[i].admin_of.length) {
                    elem[jQuery.i18n.map["management-users.admin-of"]] = CountlyHelpers.appIdsToNames(tableData[i].admin_of);
                }
                else {
                    elem[jQuery.i18n.map["management-users.admin-of"]] = "";
                }

                if (tableData[i].user_of && tableData[i].user_of.length) {
                    elem[jQuery.i18n.map["management-users.user-of"]] = CountlyHelpers.appIdsToNames(tableData[i].user_of);
                }
                else {
                    elem[jQuery.i18n.map["management-users.user-of"]] = "";
                }

                if (typeof pathsToSectionNames !== "undefined") {
                    var allUrls = getUrls();
                    if (tableData[i].restrict && tableData[i].restrict.length) {
                        var allowed = [];
                        for (var j = 0; j < allUrls.length; j++) {
                            if (tableData[i].restrict.indexOf(allUrls[j]) === -1) {
                                allowed.push(allUrls[j]);
                            }
                        }
                        elem[jQuery.i18n.map["restrict.restricted-sections"]] = pathsToSectionNames(tableData[i].restrict);
                        elem[jQuery.i18n.map["restrict.sections-allowed"]] = pathsToSectionNames(allowed);
                    }
                    else {
                        elem[jQuery.i18n.map["restrict.restricted-sections"]] = "";
                        elem[jQuery.i18n.map["restrict.sections-allowed"]] = pathsToSectionNames(allUrls);
                    }
                }

                ret.push(elem);
            }
            return ret;
        });
        if (self._id) {
            $(self.el).prepend('<a class="back back-link"><span>' + jQuery.i18n.map["common.back"] + '</span></a>');
            $(self.el).find(".back").click(function() {
                app.back("/manage/users");
            });
        }
        self.initTable();
        $("#add-user-mgmt").on("click", function() {
            CountlyHelpers.closeRows(self.dtable);
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
            app.onUserEdit({}, $(".create-user-row"));
            $(".create-user-row").slideDown();
            self.initTable();
            $(this).hide();

            $(self).trigger('user-mgmt.new-user-button-clicked');
        });
        $("#listof-apps .app").on('click', function() {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            $(this).toggleClass("selected");

            self.setSelectDeselect();

            var adminOfIds = [];
            var adminsOf = [];

            $("#listof-apps .app.selected").each(function() {
                adminsOf[adminsOf.length] = $(this).find(".name").text();
                adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
            });

            var activeRow = $(".row.selected");

            if ($("#listof-apps .app.selected").length === 0) {
                activeRow.find(".no-apps").show();
            }
            else {
                activeRow.find(".no-apps").hide();
            }

            activeRow.find(".user-admin-list").text(adminsOf.join(", "));
            activeRow.find(".app-list").val(adminOfIds.join(","));

            var userAppRow = activeRow.next(".user-apps");

            if (userAppRow.length) {
                var userAppIds = userAppRow.find(".app-list").val(),
                    usersOfIds = (userAppIds) ? userAppIds.split(",") : [];

                for (var j = 0; j < adminOfIds.length; j++) {
                    if (usersOfIds.indexOf(adminOfIds[j]) === -1) {
                        if (usersOfIds.length === 0 && j === 0) {
                            userAppRow.find(".user-admin-list").text(adminsOf[j]);
                            userAppRow.find(".app-list").val(adminOfIds[j]);
                        }
                        else {
                            userAppRow.find(".user-admin-list").text(userAppRow.find(".user-admin-list").text().trim() + ", " + adminsOf[j]);
                            userAppRow.find(".app-list").val(userAppRow.find(".app-list").val() + "," + adminOfIds[j]);
                        }

                        userAppRow.find(".no-apps").hide();
                    }
                }
            }
        });
        $(".cancel-user-row").on("click", function() {
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
            $(".create-user-row").slideUp();
            $('#add-user-mgmt').show();
        });
        $(".create-user").on("click", function() {
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
            $(".email-check.green-text").remove();
            $(".username-check.green-text").remove();

            var data = {},
                currUserDetails = $(".user-details:visible");

            data.full_name = currUserDetails.find(".full-name-text").val();
            data.username = currUserDetails.find(".username-text").val();
            data.email = currUserDetails.find(".email-text").val();
            data.global_admin = currUserDetails.find(".global-admin").hasClass("checked");
            data.password = currUserDetails.find(".password-text").val();

            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");

            if (!data.password.length) {
                currUserDetails.find(".password-text").after(reqSpan.clone());
            }
            else {
                $(".password-check").remove();
                var error = CountlyHelpers.validatePassword(data.password);
                if (error) {
                    var invalidSpan = $("<span class='password-check red-text'>").html(error);
                    currUserDetails.find(".password-text").after(invalidSpan.clone());
                }
            }

            if (!data.full_name.length) {
                currUserDetails.find(".full-name-text").after(reqSpan.clone());
            }

            if (!data.username.length) {
                currUserDetails.find(".username-text").after(reqSpan.clone());
            }

            if (!data.email.length) {
                currUserDetails.find(".email-text").after(reqSpan.clone());
            }
            else if (!CountlyHelpers.validateEmail(data.email)) {
                $(".email-check").remove();
                var invalidSpan1 = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.invalid"]);
                currUserDetails.find(".email-text").after(invalidSpan1.clone());
            }

            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            }
            else if ($(".red-text").length) {
                return false;
            }

            if (!data.global_admin) {
                data.admin_of = currUserDetails.find(".admin-apps .app-list").val().split(",");
                data.user_of = currUserDetails.find(".user-apps .app-list").val().split(",");
            }

            app.onUserEdit(data, false);

            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.users.w + '/create',
                data: {
                    args: JSON.stringify(data),
                    api_key: countlyGlobal.member.api_key
                },
                dataType: "jsonp",
                success: function() {
                    $(self).trigger('user-mgmt.user-created', data);
                    app.activeView.render();
                }
            });
        });
        $('.scrollable').slimScroll({
            height: '100%',
            start: 'top',
            wheelStep: 10,
            position: 'right',
            disableFadeOut: false
        });
        $("#select-all").on('click', function() {
            $("#listof-apps .app:not(.disabled)").addClass("selected");
            var adminsOf = [];
            var adminOfIds = [];

            $("#listof-apps .app.selected").each(function() {
                adminsOf[adminsOf.length] = $(this).find(".name").text();
                adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
            });

            var activeRow = $(".row.selected");

            activeRow.find(".user-admin-list").text(adminsOf.join(", "));
            activeRow.find(".app-list").val(adminOfIds.join(","));
            activeRow.find(".no-apps").hide();

            var userAppRow = activeRow.next(".user-apps");

            if (userAppRow.length) {
                userAppRow.find(".user-admin-list").text(adminsOf.join(", "));
                userAppRow.find(".app-list").val(adminOfIds.join(","));
                userAppRow.find(".no-apps").hide();
            }

            $(this).hide();
            $("#deselect-all").show();
        });

        $("#deselect-all").on('click', function() {
            $("#listof-apps").find(".app:not(.disabled)").removeClass("selected");

            var adminsOf = [];
            var adminOfIds = [];

            $("#listof-apps .app.selected").each(function() {
                adminsOf[adminsOf.length] = $(this).find(".name").text();
                adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
            });

            var activeRow = $(".row.selected");

            activeRow.find(".user-admin-list").text(adminsOf.join(", "));
            activeRow.find(".app-list").val(adminOfIds.join(","));

            if ($("#listof-apps .app.selected").length === 0) {
                activeRow.find(".no-apps").show();
            }
            else {
                activeRow.find(".no-apps").hide();
            }

            $(this).hide();
            $("#select-all").show();
        });

        $("#done").on('click', function() {
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        });
    },
    renderCommon: function() {
        var url = countlyCommon.API_PARTS.users.r + '/all';
        var data = {
            api_key: countlyGlobal.member.api_key
        };
        if (this._id) {
            url = countlyCommon.API_PARTS.users.r + '/id';
            data.id = this._id;
        }
        var self = this;
        $.ajax({
            url: url,
            data: data,
            dataType: "jsonp",
            success: function(users) {
                self.renderTable(users);
            },
            error: function() {
                self.renderTable();
            }
        });
        $(this).off('user-mgmt.render').on('user-mgmt.render', function() {
            app.activeView.render();
        });
    },
    setSelectDeselect: function() {
        var searchInput = $("#listof-apps").find(".search input").val();

        if (searchInput === "") {
            if ($("#listof-apps .app:not(.disabled)").length === 0) {
                $("#select-all").hide();
                $("#deselect-all").hide();
            }
            else if ($("#listof-apps .app.selected").length === $("#listof-apps .app").length) {
                $("#select-all").hide();
                $("#deselect-all").show();
            }
            else {
                $("#select-all").show();
                $("#deselect-all").hide();
            }
        }
        else {
            $("#select-all").hide();
            $("#deselect-all").hide();
        }
    },
    initTable: function(userData) {
        userData = userData || {};
        var self = this;
        var activeRow,
            previousSelectAppPos = {},
            currUsername = userData.username || "",
            currEmail = userData.email || "";
        // translate help module
        $("[data-help-localize]").each(function() {
            var elem = $(this);
            if (typeof elem.data("help-localize") !== "undefined") {
                elem.data("help", jQuery.i18n.map[elem.data("help-localize")]);
            }
        });

        // translate dashboard
        $("[data-localize]").each(function() {
            var elem = $(this);
            elem.text(jQuery.i18n.map[elem.data("localize")]);
        });

        if ($("#help-toggle").hasClass("active")) {
            $('.help-zone-vb').tipsy({
                gravity: $.fn.tipsy.autoNS,
                trigger: 'manual',
                title: function() {
                    return ($(this).data("help")) ? $(this).data("help") : "";
                },
                fade: true,
                offset: 5,
                cssClass: 'yellow',
                opacity: 1,
                html: true
            });
            $('.help-zone-vs').tipsy({
                gravity: $.fn.tipsy.autoNS,
                trigger: 'manual',
                title: function() {
                    return ($(this).data("help")) ? $(this).data("help") : "";
                },
                fade: true,
                offset: 5,
                cssClass: 'yellow narrow',
                opacity: 1,
                html: true
            });

            $.idleTimer('destroy');
            clearInterval(self.refreshActiveView);
            $(".help-zone-vs, .help-zone-vb").hover(
                function() {
                    $(this).tipsy("show");
                },
                function() {
                    $(this).tipsy("hide");
                }
            );
        }
        /** closes active edit */
        function closeActiveEdit() {
            CountlyHelpers.closeRows(self.dtable);
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        }

        $(".select-apps").off("click").on('click', function() {
            $("#listof-apps .app").removeClass("selected");
            activeRow = $(this).parent(".row");
            activeRow.addClass("selected");
            var buttonPos = $(this).offset();
            buttonPos.top = Math.floor(buttonPos.top) + 25;
            buttonPos.left = Math.floor(buttonPos.left) - 18;

            if ($("#listof-apps").is(":visible") && JSON.stringify(buttonPos) === JSON.stringify(previousSelectAppPos)) {
                $("#listof-apps").hide();
                $(".row").removeClass("selected");
                return true;
            }

            previousSelectAppPos = buttonPos;

            var appList = activeRow.find(".app-list").val().split(","),
                adminAppList = $(".admin-apps:visible .app-list").val().split(","),
                isAdminApps = activeRow.hasClass("admin-apps");

            $("#listof-apps").find(".app_id").each(function() {
                if (appList.indexOf($(this).val()) !== -1) {
                    $(this).parent().addClass("selected");
                }

                if (!isAdminApps && adminAppList.indexOf($(this).val()) !== -1) {
                    $(this).parent().addClass("disabled");
                }
                else {
                    $(this).parent().removeClass("disabled");
                }
            });

            self.setSelectDeselect();

            $("#listof-apps").show().offset(buttonPos);
            $("#listof-apps").find(".search input").focus();
        });

        $("#listof-apps").find(".search").on('input', 'input', function() {
            self.setSelectDeselect();
        });

        $(".save-user").off("click").on("click", function() {
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
            $(".email-check.green-text").remove();
            $(".username-check.green-text").remove();

            var data = {},
                currUserDetails = $(".user-details:visible"),
                changedPassword = false;

            data.user_id = $(this).parent(".button-container").find(".user_id").val();
            data.full_name = currUserDetails.find(".full-name-text").val();
            data.username = currUserDetails.find(".username-text").val();
            data.email = currUserDetails.find(".email-text").val();

            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");

            if (!data.full_name.length) {
                currUserDetails.find(".full-name-text").after(reqSpan.clone());
            }

            if (!data.username.length) {
                currUserDetails.find(".username-text").after(reqSpan.clone());
            }

            if (!data.email.length) {
                currUserDetails.find(".email-text").after(reqSpan.clone());
            }

            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            }
            else if ($(".red-text").length) {
                return false;
            }

            if (currUserDetails.find(".delete-user").length !== 0) {
                data.global_admin = currUserDetails.find(".global-admin").hasClass("checked");
                data.locked = currUserDetails.find(".lock-account").hasClass("checked");

                if (!data.global_admin) {
                    data.admin_of = currUserDetails.find(".admin-apps .app-list").val().split(",");
                    data.user_of = currUserDetails.find(".user-apps .app-list").val().split(",");
                }
            }

            if (currUserDetails.find(".password-row").is(":visible") && currUserDetails.find(".password-text").val().length) {
                data.password = currUserDetails.find(".password-text").val();
                changedPassword = true;
            }

            if (changedPassword) {
                CountlyHelpers.confirm(jQuery.i18n.prop('management-users.password-change-confirm', data.full_name), "black", function(result) {
                    if (result) {
                        data.send_notification = true;
                    }

                    saveUser();
                }, [jQuery.i18n.map["common.no"], jQuery.i18n.map["common.yes"]]);
            }
            else {
                saveUser();
            }
            /** function saves user */
            function saveUser() {
                app.onUserEdit(data, true);
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.users.w + '/update',
                    data: {
                        args: JSON.stringify(data),
                        api_key: countlyGlobal.member.api_key
                    },
                    dataType: "jsonp",
                    success: function() {
                        if (currUserDetails.find(".delete-user").length === 0) {
                            countlyGlobal.member.full_name = data.full_name;
                            countlyGlobal.member.username = data.username;
                            countlyGlobal.member.email = data.email;

                            $('.menu').find('.user_name').find('div').first().html($("<div>").text(data.full_name).html());
                            $('.menu').find('.user_name').find('div').last().html($("<div>").text(data.email).html());
                            $("#menu-username").text(data.username);
                        }
                        $(self).trigger('user-mgmt.user-updated', data);
                        app.activeView.render();
                    }
                });
            }
        });

        $(".username-text").off("keyup").on("keyup", _.throttle(function() {
            if (!($(this).val().length) || currUsername === $(this).val()) {
                $(".username-check").remove();
                return false;
            }

            $(this).next(".required").remove();

            var existSpan = $("<span class='username-check red-text'>").html(jQuery.i18n.map["management-users.username.exists"]),
                notExistSpan = $("<span class='username-check green-text'>").html("&#10004;"),
                data = {};

            data.username = $(this).val();
            data._csrf = countlyGlobal.csrf_token;

            var self2 = $(this);
            $.ajax({
                type: "POST",
                url: countlyGlobal.path + "/users/check/username",
                data: data,
                success: function(result) {
                    $(".username-check").remove();
                    if (result) {
                        self2.after(notExistSpan.clone());
                    }
                    else {
                        self2.after(existSpan.clone());
                    }
                }
            });
        }, 300));

        $(".email-text").off("keyup").on("keyup", _.throttle(function() {
            if (!($(this).val().length) || currEmail === $(this).val()) {
                $(".email-check").remove();
                return false;
            }

            $(this).next(".required").remove();

            if (!CountlyHelpers.validateEmail($(this).val())) {
                $(".email-check").remove();
                var invalidSpan = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.invalid"]);
                $(this).after(invalidSpan.clone());
                return false;
            }

            var existSpan = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.exists"]),
                notExistSpan = $("<span class='email-check green-text'>").html("&#10004;"),
                data = {};

            data.email = $(this).val();
            data._csrf = countlyGlobal.csrf_token;

            var self2 = $(this);
            $.ajax({
                type: "POST",
                url: countlyGlobal.path + "/users/check/email",
                data: data,
                success: function(result) {
                    $(".email-check").remove();
                    if (result) {
                        self2.after(notExistSpan.clone());
                    }
                    else {
                        self2.after(existSpan.clone());
                    }
                }
            });
        }, 300));

        $(".password-text").off("keyup").on("keyup", _.throttle(function() {
            $(".password-check").remove();
            var error = CountlyHelpers.validatePassword($(this).val());
            if (error) {
                var invalidSpan = $("<span class='password-check red-text'>").html(error);
                $(this).after(invalidSpan.clone());
                return false;
            }
        }, 300));

        $(".cancel-user").off("click").on("click", function() {
            closeActiveEdit();
        });
        $(".delete-user").off("click").on("click", function() {
            var currUserDetails = $(".user-details:visible");
            var fullName = currUserDetails.find(".full-name-text").val();

            var self2 = $(this);
            CountlyHelpers.confirm(jQuery.i18n.prop('management-users.delete-confirm', fullName), "popStyleGreen", function(result) {

                if (!result) {
                    return false;
                }

                var data = {
                    user_ids: [self2.parent(".button-container").find(".user_id").val()]
                };
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.users.w + '/delete',
                    data: {
                        args: JSON.stringify(data),
                        api_key: countlyGlobal.member.api_key
                    },
                    dataType: "jsonp",
                    success: function() {
                        $(app.manageUsersView).trigger('user-mgmt.user-deleted', data.user_ids);
                        app.activeView.render();
                    }
                });
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["management-users.yes-delete-user"]], {title: jQuery.i18n.map["management-users.delete-confirm-title"], image: "delete-user"});
        });
        $(".global-admin").off("click").on('click', function() {
            var currUserDetails = $(".user-details:visible");

            currUserDetails.find(".user-apps").toggle();
            currUserDetails.find(".admin-apps").toggle();
            $(this).toggleClass("checked");
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        });
        $(".remove-time-ban").off("click").on('click', function() {
            var currUserDetails = $(".user-details:visible");
            var url = countlyCommon.API_PARTS.users.r + '/reset_timeban';
            var data = {
                username: currUserDetails.find(".username-text").val()
            };
            $.ajax({
                url: url,
                data: data,
                dataType: "jsonp",
                success: function() {
                    CountlyHelpers.notify({
                        title: jQuery.i18n.map["management-users.remove-ban-notify-title"],
                        message: jQuery.i18n.map["management-users.remove-ban-notify-message"]
                    });
                    $('.blocked-user-row').hide();
                }
            });
        });
        $(".lock-account").off("click").on('click', function() {
            $(this).toggleClass("checked");
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        });
        $(".generate-password").off("click").on('click', function() {
            $(this).parent().find(".password-text").val(CountlyHelpers.generatePassword(countlyGlobal.security.password_min));
        });

        $(".change-password").off("click").on('click', function() {
            $(this).parents(".row").next().toggle();
        });
    },
    editUser: function(d, self) {
        $(".create-user-row").slideUp();
        $('#add-user-mgmt').show();
        $("#listof-apps").hide();
        $(".row").removeClass("selected");
        CountlyHelpers.closeRows(self.dtable);
        // `d` is the original data object for the row
        var str = '';
        if (d) {
            str += '<div class="user-details datatablesubrow">';

            if (countlyGlobal.member.global_admin) {
                str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.full-name">';
                str += '<div class="title" data-localize="management-users.full-name">' + jQuery.i18n.map["management-users.full-name"] + '</div>';
                str += '<div class="detail"><input class="full-name-text" type="text" value="' + d.full_name + '"/></div>';
                str += '</div>';
                str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.username">';
                str += '<div class="title" data-localize="management-users.username">' + jQuery.i18n.map["management-users.username"] + '</div>';
                str += '<div class="detail">';
                str += '<input class="username-text" type="text" value="' + d.username + '"/><br/>';
                str += '<div class="small-link change-password" data-localize="management-users.change-password">' + jQuery.i18n.map["management-users.change-password"] + '</div>';
                str += '</div>';
                str += '</div>';
                str += '<div class="row password-row">';
                str += '<div class="title" data-localize="management-users.password">' + jQuery.i18n.map["management-users.password"] + '</div>';
                str += '<div class="detail">';
                str += '<input class="password-text" type="text" value=""/><br/>';
                str += '<div class="small-link generate-password" data-localize="management-users.generate-password">' + jQuery.i18n.map["management-users.generate-password"] + '</div>';
                str += '</div>';
                str += '</div>';
                str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.email">';
                str += '<div class="title" data-localize="management-users.email">' + jQuery.i18n.map["management-users.email"] + '</div>';
                str += '<div class="detail"><input class="email-text" type="text" value="' + d.email + '"/></div>';
                str += '</div>';
            }

            if (!d.is_current_user) {
                if (countlyGlobal.member.global_admin) {
                    str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.global-admin">';
                    str += '<div class="title" data-localize="management-users.global-admin">' + jQuery.i18n.map["management-users.global-admin"] + '</div>';
                    str += '<div class="detail">';
                    str += '<div class="option">';

                    if (d.global_admin) {
                        str += '<div class="global-admin checkbox checked"></div>';
                    }
                    else {
                        str += '<div class="global-admin checkbox"></div>';
                    }

                    str += '<div class="text"></div>';
                    str += '</div>';
                    str += '</div>';
                    str += '</div>';

                    // Time ban
                    if (d.blocked) {
                        str += '<div class="row blocked-user-row help-zone-vs" data-help-localize="help.management-users.time-banned">';
                        str += '<div class="title" data-localize="management-users.time-banned" style="margin-top:7px">' + jQuery.i18n.map["management-users.time-banned"] + '</div>';
                        str += '<div class="detail">';
                        str += '<div class="option">';

                        str += '<a class="icon-button light remove-time-ban" style="margin-left:0px" data-localize="management-users.remove-ban">' + jQuery.i18n.map["management-users.remove-ban"] + '</a>';

                        str += '<div class="text"></div>';
                        str += '</div>';
                        str += '</div>';
                        str += '</div>';
                    }

                    if (!d.global_admin) {
                        str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.lock-account">';
                        str += '<div class="title" data-localize="management-users.lock-account">' + jQuery.i18n.map["management-users.lock-account"] + '</div>';
                        str += '<div class="detail">';
                        str += '<div class="option">';

                        if (d.locked) {
                            str += '<div class="lock-account checkbox checked"></div>';
                        }
                        else {
                            str += '<div class="lock-account checkbox"></div>';
                        }

                        str += '<div class="text"></div>';
                        str += '</div>';
                        str += '</div>';
                        str += '</div>';
                    }
                }

                if (d.global_admin) {
                    str += '<div class="row admin-apps help-zone-vs" data-help-localize="help.manage-users.admin-of" style="display:none;">';
                }
                else {
                    str += '<div class="row admin-apps help-zone-vs" data-help-localize="help.manage-users.admin-of">';
                }

                str += '<div class="title" data-localize="management-users.admin-of">' + jQuery.i18n.map["management-users.admin-of"] + '</div>';
                str += '<div class="select-apps">';
                str += '<i class="fa fa-plus-circle"></i>';
                str += '<input type="hidden" value="' + d.admin_of + '" class="app-list"/>';
                str += '</div>';
                str += '<div class="detail user-admin-list">';

                if (d.admin_of && d.admin_of.length) {
                    str += CountlyHelpers.appIdsToNames(d.admin_of);
                }
                else {
                    str += '<span data-localize="management-users.admin-of.tip">' + jQuery.i18n.map["management-users.admin-of.tip"] + '</span>';
                }

                str += '</div>';
                str += '<div class="no-apps" data-localize="management-users.admin-of.tip">' + jQuery.i18n.map["management-users.admin-of.tip"] + '</div>';
                str += '</div>';

                if (d.global_admin) {
                    str += '<div class="row user-apps help-zone-vs" data-help-localize="help.manage-users.user-of" style="display:none;">';
                }
                else {
                    str += '<div class="row user-apps help-zone-vs" data-help-localize="help.manage-users.user-of">';
                }

                str += '<div class="title" data-localize="management-users.user-of">' + jQuery.i18n.map["management-users.user-of"] + '</div>';
                str += '<div class="select-apps">';
                str += '<i class="fa fa-plus-circle"></i>';
                str += '<input type="hidden" value="' + d.user_of + '" class="app-list"/>';
                str += '</div>';
                str += '<div class="detail user-admin-list">';

                if (d.user_of && d.user_of.length) {
                    str += CountlyHelpers.appIdsToNames(d.user_of);
                }
                else {
                    str += '<span data-localize="management-users.user-of.tip">' + jQuery.i18n.map["management-users.user-of.tip"] + '</span>';
                }

                str += '</div>';
                str += '<div class="no-apps" data-localize="management-users.user-of.tip">' + jQuery.i18n.map["management-users.user-of.tip"] + '</div>';
                str += '</div>';
            }

            str += '<div class="button-container">';
            str += '<input class="user_id" type="hidden" value="' + d._id + '"/>';
            str += '<a class="icon-button light save-user" data-localize="common.save">' + jQuery.i18n.map["common.save"] + '</a>';
            str += '<a class="icon-button light cancel-user" data-localize="common.cancel">' + jQuery.i18n.map["common.cancel"] + '</a>';

            if (!d.is_current_user) {
                str += '<a class="icon-button red delete-user" data-localize="management-users.delete-user">' + jQuery.i18n.map["management-users.delete-user"] + '</a>';
            }

            str += '</div>';
            str += '</div>';
        }

        str = app.onUserEdit(d, str);

        setTimeout(function() {
            self.initTable(d);
            $(self).trigger('user-mgmt.user-selected', d);
        }, 1);
        return str;
    }
});

window.EventsBlueprintView = countlyView.extend({
    beforeRender: function() {},
    initialize: function() {
        var previousEvent = countlyCommon.getPersistentSettings()["activeEvent_" + countlyCommon.ACTIVE_APP_ID];
        if (previousEvent) {
            countlyEvent.setActiveEvent(previousEvent);
        }
        this.template = Handlebars.compile($("#template-events-blueprint").html());
    },
    pageScript: function() {
        var self = this;
        //submenu switch
        $(".event-container").unbind("click");
        $(".event-container").on("click", function() {
            var tmpCurrEvent = $(this).attr("data-key") || "";
            var myitem = this;
            if ($("#events-apply-changes").css('display') === "none") {
                $(".event-container").removeClass("active");
                $(myitem).addClass("active");
                if (tmpCurrEvent !== "") {
                    self.selectedSubmenu = tmpCurrEvent;
                    countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                        self.refresh(true, true);
                    });
                }
                else {
                    self.selectedSubmenu = "";
                    countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                        self.refresh(true, false);
                    });
                }
            }
            else {
                CountlyHelpers.confirm(jQuery.i18n.map["events.general.want-to-discard"], "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }

                    $(".event-container").removeClass("active");
                    $(myitem).addClass("active");
                    if (tmpCurrEvent !== "") {
                        self.selectedSubmenu = tmpCurrEvent;
                        countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                            self.refresh(true, true);
                        });
                    }
                    else {
                        self.selectedSubmenu = "";
                        countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                            self.refresh(true, false);
                        });
                    }
                }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map['common.yes-discard']], {title: jQuery.i18n.map["events.general.want-to-discard-title"], image: "empty-icon"});

            }
        });

        //General settings, select all checkbox
        $("#select-all-events").on("click", function() {
            var isChecked = $(this).hasClass("fa-check-square");//is now checked
            if (isChecked) {
                $(this).addClass("fa-square-o");
                $(this).removeClass("fa-check-square");
                $(".events-table .select-event-check").addClass("fa-square-o");
                $(".events-table .select-event-check").removeClass("fa-check-square");
            }
            else {
                $(this).removeClass("fa-square-o");
                $(this).addClass("fa-check-square");
                $(".events-table .select-event-check").removeClass("fa-square-o");
                $(".events-table .select-event-check").addClass("fa-check-square");
            }
            if ($('.select-event-check.fa-check-square').length > 0) {
                $('#events-general-action').removeClass('disabled');
            }
            else {
                $('#events-general-action').addClass('disabled');
            }
        });

        //General settings drag and drop sorting
        $(".events-table").sortable({
            items: "tbody tr",
            revert: true,
            handle: "td:first-child",
            helper: function(e, elem) {
                elem.children().each(function() {
                    $(this).width($(this).width());
                });
                elem.addClass("moving");
                elem.css("width", (parseInt(elem.width())) + "px");//to not go over line
                return elem;
            },
            cursor: "move",
            containment: "parent",
            tolerance: "pointer",
            placeholder: "event-row-placeholder",
            stop: function(e, elem) {
                elem.item.removeClass("moving");
                $("#events-apply-order").css('display', 'block');
            }
        });


        var segments = [];
        var i = 0;
        for (i = 0; i < self.activeEvent.segments.length; i++) {
            segments.push({"key": self.activeEvent.segments[i], "value": self.activeEvent.segments[i]});
        }
        for (i = 0; i < self.activeEvent.omittedSegments.length; i++) {
            segments.push({"key": self.activeEvent.omittedSegments[i], "value": self.activeEvent.omittedSegments[i]});
        }

        $('#event-management-projection').selectize({
            plugins: ['remove_button'],
            persist: false,
            maxItems: null,
            valueField: 'key',
            labelField: 'key',
            searchField: ['key'],
            delimiter: ',',
            options: segments,
            items: self.activeEvent.omittedSegments,
            render: {
                item: function(item) {
                    return '<div>' +
							item.key +
							'</div>';
                },
                option: function(item) {
                    var label = item.key;
                    //var caption = item.key;
                    return '<div>' +
							'<span class="label">' + label + '</span>' +
							'</div>';
                }
            },
            createFilter: function() {
                return true;
            },
            create: function(input) {
                return {
                    "key": input
                };
            },
            onChange: function() {
                self.check_changes();
                this.$control_input.css('width', '40px');
            }
        });

        //hide apply button
        $("#events-apply-changes").css('display', 'none');
        self.preventHashChange = false;
        $("#events-apply-order").css('display', 'none');
        $("#events-general-action").addClass("disabled");

        CountlyHelpers.initializeTableOptions($("#events-custom-settings-table"));
        $(".cly-button-menu").on("cly-list.click", function(event, data) {
            var id = $(data.target).parents("tr").data("id");
            var name = $(data.target).parents("tr").data("name");
            var visibility = $(data.target).parents("tr").data("visible");
            if (id) {
                $(".event-settings-menu").find(".delete_single_event").data("id", id);
                $(".event-settings-menu").find(".delete_single_event").data("name", name);
                $(".event-settings-menu").find(".event_toggle_visibility").data("id", id);
                if (visibility === true) {
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=hide]").show();
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=show]").hide();
                }
                else {
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=hide]").hide();
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=show]").show();
                }
            }
        });

        $(".cly-button-menu").on("cly-list.item", function(event1, data) {
            var el = $(data.target);
            var event = el.data("id");
            if (event) {
                if (el.hasClass("delete_single_event")) {
                    var eventName = el.data('name');
                    if (eventName === "") {
                        eventName = event;
                    }
                    CountlyHelpers.confirm(jQuery.i18n.prop("events.general.want-delete-this", "<b>" + eventName + "</b>"), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyEvent.delete_events([event], function(result1) {
                            if (result1 === true) {
                                var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.events-deleted"], info: "", sticky: false, clearAll: true, type: "ok"};
                                CountlyHelpers.notify(msg);
                                self.refresh(true, false);
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                            }
                        });
                    }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map['events.general.yes-delete-event']], {title: jQuery.i18n.map['events.general.want-delete-this-title'], image: "delete-an-event"});
                }
                else if (el.hasClass("event_toggle_visibility")) {
                    var toggleto = el.data("changeto");
                    countlyEvent.update_visibility([event], toggleto, function(result) {
                        if (result === true) {
                            var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                            CountlyHelpers.notify(msg);
                            self.refresh(true, false);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                        }
                    });
                }
            }
        });
    },
    renderCommon: function(isRefresh) {
        var eventData = countlyEvent.getEventData();
        var self = this;

        var eventmap = countlyEvent.getEvents(true);
        this.activeEvent = "";
        var i = 0;
        for (i = 0; i < eventmap.length; i++) {
            if (eventmap[i].is_active === true) {
                this.activeEvent = eventmap[i];
            }
        }

        this.have_drill = false;
        if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("drill") > -1) {
            this.have_drill = true;
        }

        var for_general = countlyEvent.getEventMap(true);
        var keys = Object.keys(for_general);
        var allCount = keys.length;
        var visibleCount = 0;
        var hiddenCount = 0;
        for (i = 0; i < keys.length; i++) {
            if (for_general[keys[i]].is_visible === false) {
                hiddenCount++;
            }
            else {
                visibleCount++;
            }

            if (for_general[keys[i]].is_visible !== self.visibilityFilter && (self.visibilityFilter === true || self.visibilityFilter === false)) {
                delete for_general[keys[i]];
            }
        }

        this.templateData = {
            "page-title": eventData.eventName.toUpperCase(),
            "logo-class": "events",
            "events": eventmap,
            "event-map": for_general,
            "submenu": this.selectedSubmenu || "",
            "active-event": this.activeEvent || eventmap[0],
            "visible": jQuery.i18n.map["events.general.status.visible"],
            "hidden": jQuery.i18n.map["events.general.status.hidden"],
            "allCount": allCount,
            "hiddenCount": hiddenCount,
            "visibleCount": visibleCount,
            "have_drill": this.have_drill
        };
        if (hiddenCount === 0 && self.visibilityFilter === false) {
            this.templateData.onlyMessage = jQuery.i18n.map["events.general.no-hidden-events"];
        }

        if (visibleCount === 0 && self.visibilityFilter === true) {
            this.templateData.onlyMessage = jQuery.i18n.map["events.general.no-visible-events"];
        }


        if (countlyEvent.getEvents(true).length === 0) {
            //recheck events
            $.when(countlyEvent.refreshEvents()).then(function() {
                //if still 0, display error
                if (countlyEvent.getEvents().length === 0) {
                    window.location.hash = "/analytics/events";
                }
                else {
                    //reload the view
                    app.renderWhenReady(app.eventsView);
                    self.refresh(true);
                }
            });
            return true;
        }

        if (!isRefresh) {
            this.visibilityFilter = "";
            this.selectedSubmenu = "";
            this.templateData.submenu = "";

            $(this.el).html(this.template(this.templateData));
            self.check_changes();
            self.pageScript();

            $("#events-event-settings").on("change", ".on-off-switch input", function() {
                self.check_changes();
            });

            $("#events-event-settings").on("keyup", "input", function() {
                self.check_changes();
            });

            $("#events-event-settings").on("keyup", "textarea", function() {
                self.check_changes();
            });

            //General - checkbooxes in each line:
            $("#events-custom-settings-table").on("click", ".select-event-check", function() {
                var isChecked = $(this).hasClass("fa-check-square");//is now checked
                if (isChecked) {
                    $(this).addClass("fa-square-o");
                    $(this).removeClass("fa-check-square");
                }
                else {
                    $(this).removeClass("fa-square-o");
                    $(this).addClass("fa-check-square");
                }

                if ($('.select-event-check.fa-check-square').length > 0) {
                    $('#events-general-action').removeClass('disabled');
                }
                else {
                    $('#events-general-action').addClass('disabled');
                }
            });

            //General, apply new order
            $("#events-apply-order").on("click", function() {
                var eventOrder = [];
                $("#events-custom-settings .events-table").find(".select-event-check").each(function() {
                    if ($(this).attr("data-event-key")) {
                        eventOrder.push($(this).attr("data-event-key"));
                    }
                });
                countlyEvent.update_map("", JSON.stringify(eventOrder), "", "", function(result) {
                    if (result === true) {
                        var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                        CountlyHelpers.notify(msg);
                        self.refresh(true, false);
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                    }
                });
            });

            $("#events-general-filter").on("cly-select-change", function(e, selected) {
                if (selected) {
                    if (selected === 'hidden') {
                        self.visibilityFilter = false;
                    }
                    else if (selected === 'visible') {
                        self.visibilityFilter = true;
                    }
                    else {
                        self.visibilityFilter = "";
                    }
                    self.refresh(true);
                }
            });
            //actions change
            $("#events-general-action").on("cly-select-change", function(e, selected) {
                if (selected) {
                    var changeList = [];
                    var nameList = [];
                    $("#events-custom-settings-table").find(".select-event-check").each(function() {
                        if ($(this).attr("data-event-key") && $(this).hasClass("fa-check-square")) {
                            changeList.push($(this).attr("data-event-key"));

                            if ($(this).attr("data-event-name") && $(this).attr("data-event-name") !== "") {
                                nameList.push($(this).attr("data-event-name"));
                            }
                            else {
                                nameList.push($(this).attr("data-event-key"));
                            }
                        }
                    });

                    if (changeList.length === 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["events.general.none-chosen"], "red");
                    }
                    else {
                        if (selected === "show" || selected === "hide") {
                            countlyEvent.update_visibility(changeList, selected, function(result) {
                                if (result === true) {
                                    var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                                    CountlyHelpers.notify(msg);
                                    self.refresh(true, false);
                                }
                                else {
                                    CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                                }
                            });
                        }
                        else if (selected === "delete") {
                            var title = jQuery.i18n.map["events.general.want-delete-title"];
                            var msg = jQuery.i18n.prop("events.general.want-delete", "<b>" + nameList.join(", ") + "</b>");
                            var yes_but = jQuery.i18n.map["events.general.yes-delete-events"];
                            if (changeList.length === 1) {
                                msg = jQuery.i18n.prop("events.general.want-delete-this", "<b>" + nameList.join(", ") + "</b>");
                                title = jQuery.i18n.map["events.general.want-delete-this-title"];
                                yes_but = jQuery.i18n.map["events.general.yes-delete-event"];
                            }
                            CountlyHelpers.confirm(msg, "popStyleGreen", function(result) {
                                if (!result) {
                                    return true;
                                }
                                countlyEvent.delete_events(changeList, function(result1) {
                                    if (result1 === true) {
                                        var msg1 = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.events-deleted"], sticky: false, clearAll: true, type: "ok"};
                                        CountlyHelpers.notify(msg1);
                                        self.refresh(true, false);
                                    }
                                    else {
                                        CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                                    }
                                });
                            }, [jQuery.i18n.map["common.no-dont-delete"], yes_but], {title: title, image: "delete-an-event"});
                        }
                    }
                    $("#events-general-action").clySelectSetSelection("", jQuery.i18n.map["events.general.action.perform-action"]);
                }
            });

            //save chenges for one event
            $("#events-apply-changes").on("click", function() {
                var eventMap = {};
                var eventKey = $("#events-settings-table").find(".event_key").val().replace("\\", "\\\\").replace("\$", "\\u0024").replace(".", "\\u002e");// eslint-disable-line
                eventMap[eventKey] = {};
                var omitted_segments = {};

                if ($("#events-settings-table").find(".event_name").val() !== "" && $("#events-settings-table").find(".event_name").val() !== eventKey) {
                    eventMap[eventKey].name = $("#events-settings-table").find(".event_name").val();
                }
                if ($("#events-settings-table").find(".event_count").val() !== "") {
                    eventMap[eventKey].count = $("#events-settings-table").find(".event_count").val();
                }
                if ($("#events-settings-table").find(".event_description").val() !== "") {
                    eventMap[eventKey].description = $("#events-settings-table").find(".event_description").val();
                }
                if ($("#events-settings-table").find(".event_sum").val() !== "") {
                    eventMap[eventKey].sum = $("#events-settings-table").find(".event_sum").val();
                }
                if ($("#events-settings-table").find(".event_dur").val() !== "") {
                    eventMap[eventKey].dur = $("#events-settings-table").find(".event_dur").val();
                }
                var ch = $("#events-settings-table").find(".event_visible").first();
                if ($(ch).is(":checked") === true) {
                    eventMap[eventKey].is_visible = true;
                }
                else {
                    eventMap[eventKey].is_visible = false;
                }
                omitted_segments[eventKey] = $('#event-management-projection').val() || [];

                if (self.compare_arrays(omitted_segments[eventKey], self.activeEvent.omittedSegments) && omitted_segments[eventKey].length > 0) {
                    CountlyHelpers.confirm(jQuery.i18n.map["event.edit.omitt-warning"], "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyEvent.update_map(JSON.stringify(eventMap), "", "", JSON.stringify(omitted_segments), function(result1) {
                            if (result1 === true) {
                                CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                                self.refresh(true, false);
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                            }
                        });
                    });
                }
                else {
                    countlyEvent.update_map(JSON.stringify(eventMap), "", "", JSON.stringify(omitted_segments), function(result) {
                        if (result === true) {
                            CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                            self.refresh(true, false);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                        }
                    });
                }
            });

            if (this.selectedSubmenu === "") {
                $('#events-event-settings').css("display", "none");
                $('#events-custom-settings').css("display", "block");
            }
            else {
                $('#events-event-settings').css("display", "block");
                $('#events-custom-settings').css("display", "none");
            }
        }
    },
    compare_arrays: function(array1, array2) {
        if (Array.isArray(array1) && Array.isArray(array2)) {
            if (array1.length !== array2.length) {
                return true;
            }

            for (var p = 0; p < array1.length; p++) {
                if (array2.indexOf(array1[p]) === -1) {
                    return true;
                }
                if (array1.indexOf(array2[p]) === -1) {
                    return true;
                }
            }
            return false;
        }
        else {
            if (Array.isArray(array1) || Array.isArray(array2)) {
                return false;
            }
            else {
                return array1 === array2;
            }
        }
    },
    check_changes: function() {
        var changed = false;
        if ($("#events-settings-table").find(".event_name").val() !== this.activeEvent.name) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_count").val() !== this.activeEvent.count) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_description").val() !== this.activeEvent.description) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_dur").val() !== this.activeEvent.dur) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_sum").val() !== this.activeEvent.sum) {
            changed = true;
        }

        var ch = $("#events-settings-table").find(".event_visible").first();
        if ($(ch).is(":checked") !== this.activeEvent.is_visible) {
            changed = true;
        }

        if (this.compare_arrays(($('#event-management-projection').val() || []), this.activeEvent.omittedSegments)) {
            changed = true;
        }

        if (changed) {
            $("#events-apply-changes").css("display", "block");
            this.preventHashChange = true;
        }
        else {
            $("#events-apply-changes").css("display", "none");
            this.preventHashChange = false;
        }
    },
    refresh: function(eventChanged) {
        var self = this;
        if (eventChanged) {
            $.when(countlyEvent.initialize(true)).then(function() {
                if (app.activeView !== self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(self.el).find("#events-settings-table").html(newPage.find("#events-settings-table").html());//Event settings
                $("#events-event-settings .widget-header .title").html(self.activeEvent.name);//change event settings title
                $(self.el).find("#events-custom-settings-table").html(newPage.find("#events-custom-settings-table").html()); //update general settings table   
                $(self.el).find("#event-nav-eventitems").html(newPage.find("#event-nav-eventitems").html());//reset navigation

                $('#event-filter-types div[data-value="all"]').html('<span>' + jQuery.i18n.map["events.general.show.all"] + '</span> (' + self.templateData.allCount + ')');
                $('#event-filter-types div[data-value="visible"]').html('<span>' + jQuery.i18n.map["events.general.show.visible"] + '</span> (' + self.templateData.visibleCount + ')');
                $('#event-filter-types div[data-value="hidden"]').html('<span>' + jQuery.i18n.map["events.general.show.hidden"] + '</span> (' + self.templateData.hiddenCount + ')');

                if (self.visibilityFilter === true) {
                    $('#events-general-filter').clySelectSetSelection("", jQuery.i18n.map["events.general.show.visible"] + ' (' + self.templateData.visibleCount + ')');
                }
                else if (self.visibilityFilter === false) {
                    $('#events-general-filter').clySelectSetSelection("", jQuery.i18n.map["events.general.show.hidden"] + ' (' + self.templateData.hiddenCount + ')');
                }
                else {
                    $('#events-general-filter').clySelectSetSelection("", jQuery.i18n.map["events.general.show.all"] + ' (' + self.templateData.allCount + ')');
                }
                self.pageScript(); //add scripts
                app.localize($("#events-event-settings"));
                app.localize($("#events-custom-settings-table"));

                if (self.selectedSubmenu === "") {
                    $('#events-event-settings').css("display", "none");
                    $('#events-custom-settings').css("display", "block");
                }
                else {
                    $('#events-event-settings').css("display", "block");
                    $('#events-custom-settings').css("display", "none");
                }
                $("#events-apply-order").trigger("eventSettingsTableUpdated");
            });
        }
    }
});

window.EventsOverviewView = countlyView.extend({
    beforeRender: function() {},
    initialize: function() {
        var previousEvent = countlyCommon.getPersistentSettings()["activeEvent_" + countlyCommon.ACTIVE_APP_ID];
        if (previousEvent) {
            countlyEvent.setActiveEvent(previousEvent);
        }
        this.template = Handlebars.compile($("#template-events-overview").html());
    },
    overviewTableScripts: function() {
        var self = this;
        //dragging and droping for event overview list
        $(".events-table").sortable({
            items: "tbody tr",
            revert: true,
            handle: "td:first-child",
            helper: function(e, elem) {
                elem.children().each(function() {
                    $(this).width($(this).width());
                });
                elem.css("width", (parseInt(elem.width()) - 2) + "px");//to not go over line
                elem.addClass("moving");
                return elem;
            },
            cursor: "move",
            containment: "parent",
            tolerance: "pointer",
            placeholder: "event-row-placeholder",
            stop: function(e, elem) {
                elem.item.removeClass("moving");
                self.order_changed();
                $("#update_overview_button").removeClass('disabled');
            }
        });

        $(".delete-event-overview").unbind("click");
        //removes item from overview List
        $(".delete-event-overview").on("click", function() {
            if ($(this).attr("data-order-key")) {
                var oldKey = $(this).attr("data-order-key");
                self.overviewList.splice(oldKey, 1);
                for (var i = 0; i < self.overviewList.length; i++) {
                    self.overviewList[i].order = i;
                }
            }
            self.refresh(true, true);
            $("#update_overview_button").removeClass('disabled');
        });
    },
    pageScripts: function() {
        var self = this;
        var sparkline_settings = {
            type: 'line',
            height: '40',
            width: '150',
            lineColor: '#49c1e9',
            fillColor: "transparent",
            lineWidth: 1.5,
            spotColor: '#49c1e9',
            minSpotColor: "transparent",
            maxSpotColor: "transparent",
            highlightSpotColor: "transparent",
            highlightLineColor: "transparent",
            spotRadius: 3,
            drawNormalOnTop: false,
            disableTooltips: true
        };

        $(".spark-count").sparkline('html', sparkline_settings);
        sparkline_settings.lineColor = "#ff8700";
        sparkline_settings.spotColor = "#ff8700";
        $(".spark-sum").sparkline('html', sparkline_settings);
        sparkline_settings.lineColor = "#0EC1B9";
        sparkline_settings.spotColor = "#0EC1B9";
        $(".spark-dur").sparkline('html', sparkline_settings);

        //tooltip
        $('.show-my-event-description').tooltipster({
            theme: ['tooltipster-borderless', 'tooltipster-borderless-customized'],
            contentCloning: true,
            interactive: true,
            trigger: 'hover',
            side: 'right',
            zIndex: 2,
            maxWidth: 250
        });
        self.overviewTableScripts();
    },
    reloadGraphs: function() {
        var self = this;
        countlyEvent.getOverviewData(function(dd) {
            self.overviewGraph = dd;
            for (var i = 0; i < dd.length; i++) {
                var tt = self.fixTrend(dd[i].trend);
                dd[i].trendClass = tt.class;
                dd[i].trendText = tt.text;
                dd[i].classdiv = tt.classdiv;
                dd[i].arrow_class = tt.arrow_class;
                dd[i].count = countlyCommon.getShortNumber(Math.round(dd[i].count * 100) / 100);
            }
            self.refresh(true);
        });
    },
    dateChanged: function() {
        var self = this;
        self.reloadGraphs();
    },
    order_changed: function() {
        //self.eventmap
        var self = this;
        var NeweventOrder = [];
        $("#event-overview-drawer .events-table").find(".delete-event-overview").each(function() {
            if ($(this).attr("data-order-key")) {
                var i = $(this).attr("data-order-key");
                $(this).attr("data-order-key", NeweventOrder.length);
                NeweventOrder.push({"order": NeweventOrder.length, "eventKey": self.overviewList[i].eventKey, "eventProperty": self.overviewList[i].eventProperty, "eventName": self.overviewList[i].eventName, "propertyName": self.overviewList[i].propertyName});
                $("#update_overview_button").removeClass('disabled');
            }
        });
        self.overviewList = NeweventOrder;
    },
    reset_drawer: function() {
        var self = this;
        var overviewList = countlyEvent.getOverviewList();
        self.overviewList = [];
        for (var i = 0; i < overviewList.length; i++) {
            var evname = overviewList[i].eventKey;
            var propname = overviewList[i].eventProperty;
            if (self.eventmap && self.eventmap[overviewList[i].eventKey] && self.eventmap[overviewList[i].eventKey].name) {
                evname = self.eventmap[evname].name;
            }
            if (self.eventmap && self.eventmap[overviewList[i].eventKey] && self.eventmap[overviewList[i].eventKey][propname]) {
                propname = self.eventmap[overviewList[i].eventKey][propname];
            }
            self.overviewList.push({"order": i, "eventKey": overviewList[i].eventKey, "eventProperty": overviewList[i].eventProperty, "eventName": evname, "propertyName": propname});
        }

        self.templateData["overview-list"] = self.overviewList;

        var newPage = $("<div>" + self.template(self.templateData) + "</div>");
        $(self.el).find("#events-overview-table-wrapper").html(newPage.find("#events-overview-table-wrapper").html());
        self.overviewTableScripts();
        app.localize($("#events-overview-table-wrapper"));
    },
    fixTrend: function(changePercent) {
        var value = {"class": "", "text": "", "classdiv": "u", "arrow_class": "trending_up"};
        if (changePercent.indexOf("-") !== -1) {
            value.text = changePercent;
            value.class = "down";
            value.classdiv = "d";
            value.arrow_class = "trending_down";
        }
        else if (changePercent.indexOf("∞") !== -1 || changePercent.indexOf("NA") !== -1) {
            value.text = jQuery.i18n.map["events.overview.unknown"];
            value.class = "unknown";
            value.arrow_class = "trending_flat";
        }
        else {
            value.text = changePercent;
            value.class = "up";
        }
        return value;
    },
    renderCommon: function(isRefresh) {
        var self = this;
        this.currentOverviewList = countlyEvent.getOverviewList();
        this.eventmap = countlyEvent.getEventMap();

        var app_admin = false;
        if (countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.indexOf(countlyGlobal.member.active_app_id) > -1) {
            app_admin = true;
        }

        this.templateData = {
            "logo-class": "events",
            "event-map": this.eventmap,
            "overview-list": this.overviewList || [],
            "overview-graph": this.overviewGraph || [],
            "tabledGraph": [],
            "admin_rights": app_admin,
            "event-count": Object.keys(this.eventmap).length
        };
        if (!this.overviewGraph) {
            this.overviewGraph = [];
        }
        if (!this.overviewList) {
            this.overviewList = [];
        }

        this.templateData["overview-length"] = this.templateData["overview-graph"].length;
        this.templateData["overview-table-length"] = this.templateData["overview-list"].length;

        if (!isRefresh) {
            var overviewList = countlyEvent.getOverviewList();
            this.overviewList = [];
            for (var i = 0; i < overviewList.length; i++) {
                var evname = overviewList[i].eventKey;
                var propname = overviewList[i].eventProperty;
                if (this.eventmap && this.eventmap[overviewList[i].eventKey] && this.eventmap[overviewList[i].eventKey].name) {
                    evname = this.eventmap[evname].name;
                }
                if (this.eventmap && this.eventmap[overviewList[i].eventKey] && this.eventmap[overviewList[i].eventKey][propname]) {
                    propname = this.eventmap[overviewList[i].eventKey][propname];
                }
                this.overviewList.push({"order": i, "eventKey": overviewList[i].eventKey, "eventProperty": overviewList[i].eventProperty, "eventName": evname, "propertyName": propname});
            }

            this.templateData["overview-list"] = this.overviewList;
            this.templateData["overview-length"] = this.templateData["overview-graph"].length;
            this.templateData["overview-table-length"] = this.templateData["overview-list"].length;
            $(this.el).html(this.template(this.templateData));

            self.pageScripts();

            //selecting event or property in drawer
            $(".cly-select").on("cly-select-change", function() {
                var event = $("#events-overview-event").clySelectGetSelection();
                var property = $("#events-overview-attr").clySelectGetSelection();
                if (event && property) {
                    $("#add_to_overview").removeClass('disabled');
                }
                else {
                    $("#add_to_overview").addClass('disabled');
                }
            });
            //open editing drawer
            $("#events-overview-show-configure").on("click", function() {
                $(".cly-drawer").removeClass("open editing");
                $("#events-overview-table").css("max-height", $(window).height() - 280);
                $("#event-overview-drawer").addClass("open");
                $("#event-overview-drawer").find(".close").off("click").on("click", function() {
                    $(this).parents(".cly-drawer").removeClass("open");
                    self.reset_drawer();
                });
            });

            //Add new item to overview
            $("#add_to_overview").on("click", function() {
                var event = $("#events-overview-event").clySelectGetSelection();
                var property = $("#events-overview-attr").clySelectGetSelection();
                if (event && property) {
                    if (self.overviewList.length < 12) {
                        //check if not duplicate
                        var unique_over = true;
                        for (var g = 0; g < self.overviewList.length; g++) {
                            if (self.overviewList[g].eventKey === event && self.overviewList[g].eventProperty === property) {
                                unique_over = false;
                            }
                        }
                        if (unique_over === true) {
                            self.overviewList.push({eventKey: event, eventProperty: property, eventName: self.eventmap[event].name, propertyName: self.eventmap[event][property] || jQuery.i18n.map["events.table." + property], order: self.overviewList.length});
                            $("#events-overview-event").clySelectSetSelection("", jQuery.i18n.map["events.overview.choose-event"]);
                            $("#events-overview-attr").clySelectSetSelection("", jQuery.i18n.map["events.overview.choose-property"]);
                            $("#update_overview_button").removeClass('disabled');
                        }
                        else {
                            var msg2 = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["events.overview.have-already-one"], info: "", type: "error", sticky: false, clearAll: true};
                            CountlyHelpers.notify(msg2);
                        }
                    }
                    else {
                        var msg1 = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["events.overview.max-c"], info: "", type: "error", sticky: false, clearAll: true};
                        CountlyHelpers.notify(msg1);
                    }
                }
                self.refresh(true, true);
            });

            //save changes made in overview drawer
            $("#update_overview_button").on("click", function() {
                countlyEvent.update_map("", "", JSON.stringify(self.overviewList), "", function(result) {
                    if (result === true) {
                        var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true, type: "ok"};
                        CountlyHelpers.notify(msg);
                        $("#event-overview-drawer").removeClass('open');
                        $.when(countlyEvent.initialize(true)).then(function() {
                            var overviewList2 = countlyEvent.getOverviewList();
                            this.overviewList = [];
                            for (var p = 0; p < overviewList2.length; p++) {
                                this.overviewList.push({"order": p, "eventKey": overviewList2[p].eventKey, "eventProperty": overviewList2[p].eventProperty, "eventName": overviewList2[p].eventName, "propertyName": overviewList2[p].propertyName});
                            }
                            self.dateChanged();
                        });
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                    }
                });
            });
            self.reloadGraphs();

            $(window).on('resize', function() {
                self.refresh(true);
            });
        }
    },
    refresh: function(dataChanged, onlyTable) {
        var self = this;
        if (dataChanged) {
            self.renderCommon(true);
            if (onlyTable !== true) {
                var window_width = $(window).width();
                var per_line = 4;
                if (window_width < 1200) {
                    per_line = 3;
                }
                if (window_width < 750) {
                    per_line = 2;
                }
                if (window_width < 500) {
                    per_line = 1;
                }

                var lineCN = Math.ceil(self.overviewGraph.length / per_line);
                var displayOverviewTable = [];
                for (var i = 0; i < lineCN; i++) {
                    displayOverviewTable[i] = [];
                    for (var j = 0; j < per_line; j++) {
                        if (i * per_line + j < self.overviewGraph.length) {
                            displayOverviewTable[i][j] = self.overviewGraph[i * per_line + j];
                        }
                        else {
                            displayOverviewTable[i][j] = {};
                        }
                    }
                }
                self.templateData.tabledGraph = displayOverviewTable;
            }

            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find("#events-overview-table-wrapper").html(newPage.find("#events-overview-table-wrapper").html());//Event settings
            app.localize($("#events-overview-table-wrapper"));
            if (onlyTable !== true) {
                $(self.el).find("#eventOverviewWidgets").html(newPage.find("#eventOverviewWidgets").html()); //redraw widgets
                app.localize($("#eventOverviewWidgets"));
                self.pageScripts();
                self.overviewTableScripts();
            }
            else {
                self.overviewTableScripts();
            }
            if ($(".events-empty-block").length > 0) {
                $(".events-empty-block").first().parent().css("height", $(window).height() - 230);
            }

        }
    }
});

window.EventsView = countlyView.extend({
    showOnGraph: {"event-count": true, "event-sum": true, "event-dur": true},
    beforeRender: function() {},
    initialize: function() {
        var previousEvent = countlyCommon.getPersistentSettings()["activeEvent_" + countlyCommon.ACTIVE_APP_ID];
        if (previousEvent) {
            countlyEvent.setActiveEvent(previousEvent);
        }
        this.template = Handlebars.compile($("#template-events").html());
    },
    pageScript: function() {
        $(".event-container").unbind("click");
        $(".segmentation-option").unbind("click");
        $(".big-numbers").unbind("click");

        var self = this;

        $(".event-container").on("click", function() {
            var tmpCurrEvent = $(this).data("key");
            for (var i in self.showOnGraph) {
                self.showOnGraph[i] = true;
            }
            $(".event-container").removeClass("active");
            $(this).addClass("active");

            countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                self.refresh(true);
            });
        });

        $(".segmentation-option").on("click", function() {
            var tmpCurrSegmentation = $(this).data("value");
            countlyEvent.setActiveSegmentation(tmpCurrSegmentation, function() {
                if (countlyEvent.hasLoadedData()) {
                    self.renderCommon(true);
                    var newPage = $("<div>" + self.template(self.templateData) + "</div>");

                    $(self.el).find("#event-nav .scrollable").html(function() {
                        return newPage.find("#event-nav .scrollable").html();
                    });

                    $(self.el).find(".widget-footer").html(newPage.find(".widget-footer").html());
                    $(self.el).find("#edit-event-container").replaceWith(newPage.find("#edit-event-container"));

                    var eventData = countlyEvent.getEventData();
                    self.drawGraph(eventData);
                    self.pageScript();

                    self.drawTable(eventData);
                    app.localize();
                }
            });
        });

        $(".big-numbers").on("click", function() {
            if ($(".big-numbers.selected").length === 1) {
                if ($(this).hasClass("selected")) {
                    return true;
                }
                else {
                    self.showOnGraph[$(this).data("type")] = true;
                }
            }
            else if ($(".big-numbers.selected").length > 1) {
                if ($(this).hasClass("selected")) {
                    self.showOnGraph[$(this).data("type")] = false;
                }
                else {
                    self.showOnGraph[$(this).data("type")] = true;
                }
            }

            $(this).toggleClass("selected");

            self.drawGraph(countlyEvent.getEventData());
        });

        if (countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID]) {
            $("#edit-events-button").show();
        }
        setTimeout(self.resizeTitle, 100);
    },
    drawGraph: function(eventData) {
        $(".big-numbers").removeClass("selected");
        var use = [];
        var cnt = 0;
        var i = 0;
        for (i in this.showOnGraph) {
            if (this.showOnGraph[i]) {
                $(".big-numbers." + i).addClass("selected");
                use.push(cnt);
            }
            cnt++;
        }

        var data = [];
        for (i = 0; i < use.length; i++) {
            if (parseInt(eventData.dataLevel) === 2) {
                data.push(eventData.chartDP.dp[use[i]]);
            }
            else {
                data.push(eventData.chartDP[use[i]]);
            }
        }


        if (parseInt(eventData.dataLevel) === 2) {
            eventData.chartDP.dp = data;
            countlyCommon.drawGraph(eventData.chartDP, "#dashboard-graph", "bar", {series: {stack: null}});
        }
        else {
            eventData.chartDP = data;
            countlyCommon.formatSecondForDP(eventData.chartDP, jQuery.i18n.map["views.duration"]);
            countlyCommon.drawTimeGraph(eventData.chartDP, "#dashboard-graph");
        }
    },
    drawTable: function(eventData) {
        if (this.dtable && this.dtable.fnDestroy) {
            this.dtable.fnDestroy(true);
        }

        $("#event-main").append('<table class="d-table" cellpadding="0" cellspacing="0"></table>');

        var aaColumns = [];

        if (countlyEvent.isSegmentedView()) {
            aaColumns.push({"mData": "curr_segment", "sTitle": jQuery.i18n.map["events.table.segmentation"]});
        }
        else {
            aaColumns.push({"mData": "date", "sType": "customDate", "sTitle": jQuery.i18n.map["common.date"]});
        }

        aaColumns.push({
            "mData": "c",
            sType: "formatted-num",
            "mRender": function(d) {
                return countlyCommon.formatNumber(d);
            },
            "sTitle": eventData.tableColumns[1]
        });

        if (eventData.tableColumns[2]) {
            if (eventData.tableColumns[2] === jQuery.i18n.map["events.table.dur"]) {
                aaColumns.push({
                    "mData": "dur",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatSecond(d);
                    },
                    "sTitle": eventData.tableColumns[2]
                });
                aaColumns.push({
                    "sClass": "dynamic-col",
                    "mData": function(row) {
                        if (parseInt(row.c) === 0 || parseInt(row.dur) === 0) {
                            return 0;
                        }
                        else {
                            return (row.dur / row.c);
                        }
                    },
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatSecond(d);
                    },
                    "sTitle": jQuery.i18n.map["events.table.avg-dur"]
                });
            }
            else {
                aaColumns.push({
                    "mData": "s",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": eventData.tableColumns[2]
                });
                aaColumns.push({
                    "sClass": "dynamic-col",
                    "mData": function(row) {
                        if (parseInt(row.c) === 0 || parseInt(row.s) === 0) {
                            return 0;
                        }
                        else {
                            return (row.s / row.c);
                        }
                    },
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["events.table.avg-sum"]
                });
            }
        }

        if (eventData.tableColumns[3]) {
            aaColumns.push({
                "mData": "dur",
                sType: "formatted-num",
                "mRender": function(d) {
                    return countlyCommon.formatSecond(d);
                },
                "sTitle": eventData.tableColumns[3]
            });
            aaColumns.push({
                "sClass": "dynamic-col",
                "mData": function(row) {
                    if (parseInt(row.c) === 0 || parseInt(row.dur) === 0) {
                        return 0;
                    }
                    else {
                        return (row.dur / row.c);
                    }
                },
                sType: "formatted-num",
                "mRender": function(d) {
                    return countlyCommon.formatSecond(d);
                },
                "sTitle": jQuery.i18n.map["events.table.avg-dur"]
            });
        }

        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": eventData.chartData,
            "aoColumns": aaColumns
        }));

        $(".d-table").stickyTableHeaders();
    },
    resizeTitle: function() {
        var dW = $("#date-selector").width();
        var bW = $("#events-widget-header").width();
        $("#events-widget-header .dynamic-title").css("max-width", (bW - dW - 20) + "px");
    },
    getColumnCount: function() {
        return $(".dataTable").first().find("thead th").length;
    },
    getDataColumnCount: function(cnt) {
        if (cnt === 3) {
            return 4;
        }
        if (cnt === 4) {
            return 6;
        }
        return cnt;
    },
    renderCommon: function(isRefresh) {
        var eventData = countlyEvent.getEventData(),
            eventSummary = countlyEvent.getEventSummary(),
            self = this;

        var showManagmentButton = false;
        (countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.indexOf(countlyGlobal.member.active_app_id) > -1);
        {
            showManagmentButton = true;
        }
        var eventCount = countlyEvent.getEvents().length;
        this.templateData = {
            "page-title": eventData.eventName.toUpperCase(),
            "event-description": eventData.eventDescription,
            "logo-class": "events",
            "events": countlyEvent.getEvents(),
            "event-map": countlyEvent.getEventMap(),
            "segmentations": countlyEvent.getEventSegmentations(),
            "active-segmentation": countlyEvent.getActiveSegmentation(),
            "big-numbers": eventSummary,
            "chart-data": {
                "columnCount": eventData.tableColumns.length,
                "columns": eventData.tableColumns,
                "rows": eventData.chartData
            },
            "showManagmentButton": showManagmentButton,
            "event-count": eventCount
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if (eventCount > 0) {
                for (var i in this.showOnGraph) {
                    self.showOnGraph[i] = $(".big-numbers.selected." + i).length;
                }
                this.drawGraph(eventData);
                this.drawTable(eventData);
                this.pageScript();
            }
            $(window).on('resize', function() {
                self.resizeTitle();
            });
        }
    },
    refresh: function(eventChanged, segmentationChanged) {
        var self = this;
        self.resizeTitle();
        $.when(countlyEvent.initialize(eventChanged)).then(function() {

            if (app.activeView !== self) {
                return false;
            }
            if (countlyEvent.hasLoadedData()) {
                self.renderCommon(true);

                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                if (self.templateData['event-count'] > 0) {
                    $(self.el).find("#event-nav .scrollable").html(function() {
                        return newPage.find("#event-nav .scrollable").html();
                    });

                    $(self.el).find(".events-general-description").html(function() {
                        return newPage.find(".events-general-description").html();
                    });

                    // Segmentation change does not require title area refresh
                    if (!segmentationChanged) {
                        if ($("#event-update-area .cly-select").length && !eventChanged) {
                        // If there is segmentation for this event and this is not an event change refresh
                        // we just refresh the segmentation select's list
                            $(self.el).find("#event-update-area .select-items").html(function() {
                                return newPage.find("#event-update-area .select-items").html();
                            });

                            $("#event-update-area .select-items>div").addClass("scroll-list");
                            $("#event-update-area .select-items").find(".scroll-list").slimScroll({
                                height: '100%',
                                start: 'top',
                                wheelStep: 10,
                                position: 'right',
                                disableFadeOut: true
                            });

                            $(".select-items .item").click(function() {
                                var selectedItem = $(this).parents(".cly-select").find(".text");
                                selectedItem.text($(this).text());
                                selectedItem.data("value", $(this).data("value"));
                            });
                        }
                        else {
                        // Otherwise we refresh whole title area including the title and the segmentation select
                        // and afterwards initialize the select since we replaced it with a new element
                            $(self.el).find("#event-update-area").replaceWith(newPage.find("#event-update-area"));
                        }
                    }

                    $(self.el).find(".widget-footer").html(newPage.find(".widget-footer").html());
                    $(self.el).find("#edit-event-container").replaceWith(newPage.find("#edit-event-container"));

                    var eventData = countlyEvent.getEventData();
                    var i = 0;
                    for (i in self.showOnGraph) {
                        if (!$(".big-numbers." + i).length) {
                            self.showOnGraph[i] = false;
                        }
                    }
                    for (i in self.showOnGraph) {
                        if (self.showOnGraph[i]) {
                            $(".big-numbers." + i).addClass("selected");
                        }
                    }

                    self.drawGraph(eventData);
                    self.pageScript();

                    if (eventChanged || segmentationChanged) {
                        self.drawTable(eventData);
                    }
                    else if (self.getColumnCount() !== self.getDataColumnCount(eventData.tableColumns.length)) {
                        self.drawTable(eventData);
                    }
                    else {
                        CountlyHelpers.refreshTable(self.dtable, eventData.chartData);
                    }
                }
                app.localize();
                $('.nav-search').find("input").trigger("input");
            }
        });
    }
});

window.DashboardView = countlyView.extend({
    renderCommon: function() {
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
            var type = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            type = jQuery.i18n.map["management-applications.types." + type] || type;
            $(this.el).html("<div id='no-app-type'><h1>" + jQuery.i18n.map["common.missing-type"] + ": " + type + "</h1><h3><a href='#/manage/plugins'>" + jQuery.i18n.map["common.install-plugin"] + "</a><br/>" + jQuery.i18n.map["common.or"] + "<br/><a href='#/manage/apps'>" + jQuery.i18n.map["common.change-app-type"] + "</a></h3></div>");
        }
        else {
            $(this.el).html("<div id='no-app-type'><h1>" + jQuery.i18n.map["management-applications.no-app-warning"] + "</h1><h3><a href='#/manage/apps'>" + jQuery.i18n.map["common.add-new-app"] + "</a></h3></div>");
        }
    }
});

window.DownloadView = countlyView.extend({
    renderCommon: function() {
        var self = this;
        if (!this.task_id) {
            $(this.el).html('<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-not-available-title"] + '</h1><p>' + jQuery.i18n.map["downloading-view.download-not-available-text"] + '</p></div>');
            return;
        }

        countlyTaskManager.fetchResult(this.task_id, function(res) {
            var myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-title"] + '</h1>';
            if (res && res.data) {
                self.link = countlyCommon.API_PARTS.data.r + "/app_users/download/" + res.data + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID;
                window.location = self.link;


                if (self.link) {
                    myhtml += '<p><a href="' + self.link + '">' + jQuery.i18n.map["downloading-view.if-not-start"] + '</a></p>';
                }
                myhtml += "</div>";
            }
            else {
                myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-not-available-title"] + '</h1><p>' + jQuery.i18n.map["downloading-view.download-not-available-text"] + '</p></div>';
            }
            $(self.el).html(myhtml);

        });
    }
});

window.LongTaskView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#report-manager-template").html());
        this.taskCreatedBy = 'manually';
        this.types = {
            "all": jQuery.i18n.map["common.all"],
            "funnels": jQuery.i18n.map["sidebar.funnels"] || "Funnels",
            "drill": jQuery.i18n.map["drill.drill"] || "Drill"
        };

        this.runTimeTypes = {
            "all": jQuery.i18n.map["common.all"],
            "auto-refresh": jQuery.i18n.map["taskmanager.auto"],
            "none-auto-refresh": jQuery.i18n.map["taskmanager.manual"]
        };

        this.states = {
            "all": jQuery.i18n.map["common.all"],
            "running": jQuery.i18n.map["common.running"],
            "rerunning": jQuery.i18n.map["taskmanager.rerunning"],
            "completed": jQuery.i18n.map["common.completed"],
            "errored": jQuery.i18n.map["common.errored"]
        };
    },
    beforeRender: function() {
        return $.when(countlyTaskManager.initialize(null,
            {"manually_create": true}
        )).then(function() {});
    },
    getStatusColor: function(status) {
        if (status === "completed") {
            return "#2FA732";
        }
        if (status === "errored") {
            return "#D63E40";
        }
        return "#E98010";
    },
    reporInputValidator: function() {
        var report_name = $("#report-name-input").val();
        //var report_desc = $("#report-desc-input").val();
        // var global = $("#report-global-option").hasClass("selected") || false;
        var autoRefresh = $("#report-refresh-option").hasClass("selected");
        var period = $("#single-period-dropdown").clySelectGetSelection();
        if (!report_name || (autoRefresh && !period)) {
            $("#create-report").addClass("disabled");
            return false;
        }
        $("#create-report").removeClass("disabled");
        return true;
    },
    loadReportDrawerView: function(id) {
        $("#current_report_id").text(id);
        var data = countlyTaskManager.getResults();
        for (var i = 0; i < data.length; i++) {
            if (data[i]._id === id) {
                $("#report-name-input").val(data[i].report_name);
                $("#report-desc-input").val(data[i].report_desc);

                if (data[i].global) {
                    $("#report-global-option").addClass("selected");
                    $("#report-private-option").removeClass("selected");
                }
                else {
                    $("#report-private-option").addClass("selected");
                    $("#report-global-option").removeClass("selected");
                }

                if (data[i].autoRefresh) {
                    $("#report-refresh-option").addClass("selected");
                    $("#report-onetime-option").removeClass("selected");
                    $("#single-period-dropdown").clySelectSetSelection(
                        data[i].period_desc,
                        jQuery.i18n.map["taskmanager.last-" + data[i].period_desc]
                    );
                }
                else {
                    $("#report-period-block").css("display", "none");
                    $("#report-refresh-option").removeClass("selected");
                    $("#report-onetime-option").addClass("selected");

                }
            }
        }
        $("#report-widget-drawer").addClass("open");
    },
    initDrawer: function() {
        var self = this;

        $('#report-widge-close').off("click").on("click", function() {
            $("#report-widget-drawer").removeClass("open");
        });
        $("#report-global-option").off("click").on("click", function() {
            $("#report-global-option").addClass("selected");
            $("#report-private-option").removeClass("selected");
            self.reporInputValidator();
        });
        $("#report-private-option").off("click").on("click", function() {
            $("#report-private-option").addClass("selected");
            $("#report-global-option").removeClass("selected");
            self.reporInputValidator();
        });

        $("#report-onetime-option").off("click").on("click", function() {
            $("#report-onetime-option").addClass("selected");
            $("#report-refresh-option").removeClass("selected");
            $("#report-period-block").css("display", "none");
            self.reporInputValidator();
        });
        $("#report-refresh-option").off("click").on("click", function() {
            $("#report-refresh-option").addClass("selected");
            $("#report-onetime-option").removeClass("selected");
            $("#report-period-block").css("display", "block");
            self.reporInputValidator();
        });

        $("#single-period-dropdown").clySelectSetItems([
            { value: 'today', name: jQuery.i18n.map["taskmanager.last-today"]},
            { value: '7days', name: jQuery.i18n.map["taskmanager.last-7days"]},
            { value: '30days', name: jQuery.i18n.map["taskmanager.last-30days"]}
        ]);

        $("#single-period-dropdown").clySelectSetSelection("", jQuery.i18n.map["drill.select_a_period"]);

        $("#report-name-input").off("keyup").on("keyup", function() {
            self.reporInputValidator();
        });
        $("#report-desc-input").off("keyup").on("keyup", function() {
            self.reporInputValidator();
        });
        $("#single-period-dropdown").off("cly-select-change").on("cly-select-change", function() {
            self.reporInputValidator();
        });

        $("#create-report").off("click").on("click", function() {
            var report_id = $("#current_report_id").text();
            var canSubmit = self.reporInputValidator();
            if (!canSubmit) {
                return;
            }
            var report_name = $("#report-name-input").val();
            var report_desc = $("#report-desc-input").val();
            var global_permission = $("#report-global-option").hasClass("selected");
            var autoRefresh = $("#report-refresh-option").hasClass("selected");
            var period = $("#single-period-dropdown").clySelectGetSelection();
            if (autoRefresh && !period) {
                return CountlyHelpers.alert(jQuery.i18n.map["drill.report_fileds_remind"],
                    "green",
                    function(/*result*/) { });
            }


            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + '/tasks/edit',
                data: {
                    "task_id": report_id,
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "report_name": report_name,
                    "report_desc": report_desc,
                    "global": global_permission,
                    "autoRefresh": autoRefresh,
                    "period_desc": autoRefresh ? period : null
                },
                dataType: "jsonp",
                success: function() {
                    self.refresh();
                    $("#report-widget-drawer").removeClass("open");
                },
                error: function() {
                    self.refresh();
                    $("#report-widget-drawer").removeClass("open");
                }
            });
        });
        $("#create-report").addClass("disabled");
    },
    renderCommon: function(isRefresh) {
        var self = this;
        this.templateData = {
            "page-title": jQuery.i18n.map["report-maanger.manually-created-title"],
            "filter1": this.types,
            "active-filter1": jQuery.i18n.map["taskmanager.select-origin"],
            "filter2": this.runTimeTypes,
            "active-filter2": jQuery.i18n.map["common.select-type"],
            "filter3": this.states,
            "active-filter3": jQuery.i18n.map["common.select-status"],
            "graph-description": jQuery.i18n.map['taskmanager.automatically-table-remind']
        };
        var typeCodes = ['manually', 'automatically'];
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.tabs = $("#reports-manager-tabs").tabs();
            this.tabs.on("tabsselect", function(event, ui) {
                self.taskCreatedBy = typeCodes[ui.index];
                $("#report-manager-table-title").text(jQuery.i18n.map["report-maanger." + self.taskCreatedBy + "-created-title"]);
                self.refresh();
            });
            this.renderTable();
            this.initDrawer();
        }
        if (self.taskCreatedBy === 'manually') {
            $("#report-manager-graph-description").text(jQuery.i18n.map['taskmanager.manually-table-remind']);
        }
        else {
            $("#report-manager-graph-description").text(jQuery.i18n.map['taskmanager.automatically-table-remind']);
        }
        var manuallyColumns = [true, true, true, false, true, true, true, true, true, false, false];
        var automaticallyColumns = [false, false, true, true, true, false, false, false, false, true, true];

        if (self.taskCreatedBy === 'manually') {
            manuallyColumns.forEach(function(vis, index) {
                self.dtable.fnSetColumnVis(index, vis);
            });
            $(".report-manager-idget-header .filter2-segmentation").show();
            $(".report-manager-idget-header .filter3-segmentation").hide();
        }
        else {
            automaticallyColumns.forEach(function(vis, index) {
                self.dtable.fnSetColumnVis(index, vis);
            });
            $(".report-manager-idget-header .filter2-segmentation").hide();
            $(".report-manager-idget-header .filter3-segmentation").show();
        }
    },
    renderTable: function() {
        var self = this;
        var tableColumns = [];
        tableColumns = [
            {
                "mData": function(row) {
                    return row.report_name || "-";
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.name"],
                "bSortable": true,
                "sClass": "break"
            },
            {
                "mData": function(row) {
                    return row.report_desc || "-";
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.desc"],
                "bSortable": false,
                "sClass": "break"
            },
            {
                "mData": function(row) {
                    return row.name || row.meta || "";
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.data"],
                "bSortable": false,
                "sClass": "break"
            },
            {
                "mData": function(row) {
                    return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.states[row.status] || row.status) + "</span>";
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["common.status"]
            },
            {
                "mData": function(row) {
                    return '<span class="status-color" style="text-transform:capitalize">' + row.type + "</span>";
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["taskmanager.origin"]
            },
            {
                "mData": function(row) {
                    return row.autoRefresh ? jQuery.i18n.map["taskmanager.auto"] : jQuery.i18n.map["taskmanager.manual"];
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["common.type"],
                "bSortable": false,
                "sClass": "break"
            },
            {
                "mData": function(row) {
                    return row.period_desc || "-";
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.period"],
                "bSortable": false,
                "sClass": "break"
            },
            {
                "mData": function(row) {
                    return row.global === false ? 'Private' : 'Global';
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.visibility"],
                "bSortable": false,
                "sClass": "break"
            },
            {
                "mData": function(row, type) {
                    if (type === "display") {
                        return countlyCommon.formatTimeAgo(row.start);
                    }
                    else {
                        return row.start;
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["common.last-updated"]
            },
            {
                "mData": function(row, type) {
                    if (type === "display") {
                        return countlyCommon.formatTimeAgo(row.start);
                    }
                    else {
                        return row.start;
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["common.started"]
            },
            {
                "mData": function(row, type) {
                    var time = 0;
                    if (row.status === "running" || row.status === "rerunning") {
                        time = Math.max(new Date().getTime() - row.start, 0);
                    }
                    else if (row.end && row.end > row.start) {
                        time = row.end - row.start;
                    }
                    if (type === "display") {
                        return countlyCommon.formatTime(Math.round(time / 1000));
                    }
                    else {
                        return time;
                    }
                },
                "sType": "numeric",
                "sTitle": jQuery.i18n.map["events.table.dur"]
            },
            {
                "mData": function() {
                    return '<a class="cly-list-options"></a>';
                },
                "sType": "string",
                "sTitle": "",
                "sClass": "shrink center",
                bSortable: false
            }
        ];

        this.dtable = $('#data-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": countlyTaskManager.getResults(),
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("data-id", aData._id);
                $(nRow).attr("data-name", aData.report_name || aData.name || '-');
            },
            "aoColumns": tableColumns
        }));
        this.dtable.stickyTableHeaders();
        this.dtable.fnSort([ [3, 'desc'] ]);
        $(this.el).append('<div class="cly-button-menu tasks-menu" tabindex="1">' +
            '<a class="item view-task" href="" data-localize="common.view"></a>' +
            '<a class="item rerun-task" data-localize="taskmanager.rerun"></a>' +
            '<a class="item edit-task" data-localize="taskmanager.edit"></a>' +
            '<a class="item delete-task" data-localize="common.delete"></a>' +
        '</div>');
        CountlyHelpers.initializeTableOptions();

        $(".cly-button-menu").on("cly-list.click", function(event, data) {
            var id = $(data.target).parents("tr").data("id");
            var reportName = $(data.target).parents("tr").data("name");
            if (id) {
                var row = countlyTaskManager.getTask(id);
                $(".tasks-menu").find(".edit-task").data("id", id);
                if (countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID]) {
                    $(".tasks-menu").find(".delete-task").data("id", id);
                    $(".tasks-menu").find(".delete-task").data("name", reportName);
                }
                else {
                    $(".tasks-menu").find(".delete-task").hide();
                }

                if (row.status !== "running" && row.status !== "rerunning") {
                    if (row.view && row.hasData) {
                        $(".tasks-menu").find(".view-task").attr("href", row.view + row._id).data("localize", "common.view").text(jQuery.i18n.map["common.view"]).show();
                    }
                    else {
                        $(".tasks-menu").find(".view-task").hide();
                    }
                    if (row.request) {
                        $(".tasks-menu").find(".rerun-task").data("id", id).show();
                    }
                    else {
                        $(".tasks-menu").find(".rerun-task").hide();
                    }
                }
                else {
                    if (row.view && row.hasData) {
                        $(".tasks-menu").find(".view-task").attr("href", row.view + row._id).data("localize", "taskmanager.view-old").text(jQuery.i18n.map["taskmanager.view-old"]).show();
                    }
                    else {
                        $(".tasks-menu").find(".view-task").hide();
                    }
                }


                if (self.taskCreatedBy === 'manually') {
                    $(".tasks-menu").find(".rerun-task").hide();
                    $(".tasks-menu").find(".edit-task").show();
                }
                else {
                    $(".tasks-menu").find(".edit-task").hide();
                    $(".tasks-menu").find(".rerun-task").show();
                }
            }
        });

        $(".cly-button-menu").on("cly-list.item", function(event, data) {
            var el = $(data.target);
            var id = el.data("id");
            if (id) {
                if (el.hasClass("delete-task")) {
                    CountlyHelpers.confirm(jQuery.i18n.prop("taskmanager.confirm-delete", "<b>" + el.data("name") + "</b>"), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyTaskManager.del(id, function() {
                            self.refresh();
                        });
                    }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["taskmanager.yes-delete-report"]], {title: jQuery.i18n.map["taskmanager.confirm-delete-title"], image: "delete-report"});
                }
                else if (el.hasClass("rerun-task")) {
                    CountlyHelpers.confirm(jQuery.i18n.map["taskmanager.confirm-rerun"], "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyTaskManager.update(id, function(res) {
                            if (res.result === "Success") {
                                countlyTaskManager.monitor(id, true);
                                self.refresh();
                            }
                            else {
                                CountlyHelpers.alert(res.result, "red");
                            }
                        });
                    }, [jQuery.i18n.map["common.no-dont-do-that"], jQuery.i18n.map["taskmanager.yes-rerun-report"]], {title: jQuery.i18n.map["taskmanager.confirm-rerun-title"], image: "rerunning-task"});
                }
                else if (el.hasClass("edit-task")) {
                    self.loadReportDrawerView(id);
                }
            }
        });

        $(".filter1-segmentation .segmentation-option").on("click", function() {
            if (!self._query) {
                self._query = {};
            }
            self._query.type = $(this).data("value");
            if (self._query.type === "all") {
                delete self._query.type;
            }
            self.refresh();
        });

        $(".filter2-segmentation .segmentation-option").on("click", function() {
            if (!self._query) {
                self._query = {};
            }
            self._query.autoRefresh = $(this).data("value") === 'auto-refresh';
            if ($(this).data("value") === "all") {
                delete self._query.autoRefresh;
            }
            self.refresh();
        });
        $(".filter3-segmentation .segmentation-option").on("click", function() {
            if (!self._query) {
                self._query = {};
            }
            self._query.status = $(this).data("value");
            if (self._query.status === "all") {
                delete self._query.status;
            }
            self.refresh();
        });
    },
    refresh: function() {
        var self = this;
        self._query = self._query ? self._query : {};
        var queryObject = {};
        Object.assign(queryObject, self._query);
        if (self.taskCreatedBy === 'manually') {
            queryObject.manually_create = true;
            delete queryObject.status;
        }
        else {
            queryObject.manually_create = {$ne: true};
            delete queryObject.autoRefresh;
        }
        $.when(countlyTaskManager.initialize(true, queryObject)).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var data = countlyTaskManager.getResults();
            CountlyHelpers.refreshTable(self.dtable, data);
            app.localize();
        });
    }
});

window.VersionHistoryView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#version-history-template").html());
    },
    beforeRender: function() {
        return $.when(countlyVersionHistoryManager.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {
        //provide template data
        this.templateData = {"page-title": jQuery.i18n.map["version_history.page-title"]};

        var tableData = countlyVersionHistoryManager.getData() || [];
        if (!Array.isArray(tableData)) {
            tableData = [];
        }
        if (tableData.length === 0) {
            tableData.push({"version": countlyGlobal.countlyVersion, "updated": Date.now()});
        }
        else {
            tableData[tableData.length - 1].version += (" " + jQuery.i18n.map["version_history.current-version"]);
        }

        var self = this;
        if (!isRefresh) {
            //set data
            $(this.el).html(this.template(this.templateData));

            this.dtable = $('#data-table').dataTable($.extend({"searching": false, "paging": false}, $.fn.dataTable.defaults, {
                "aaData": tableData,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("data-id", aData._id);
                    //$(nRow).attr("data-name", aData.report_name || aData.name || '-');
                },
                "aoColumns": [
                    {
                        "mData": function(row) {
                            return row.version;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["version_history.version"],
                        "bSortable": false,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            return new Date(row.updated);
                        },
                        "sType": "numeric",
                        "sTitle": jQuery.i18n.map["version_history.upgraded"],
                        "bSortable": true,
                        "sClass": "break"
                    }
                ]
            }));
            self.dtable.fnSort([ [1, 'desc'] ]);
        }
    }
});

window.TokenManagerView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#token-manager-template").html());
    },
    beforeRender: function() {
        return $.when(countlyTokenManager.initialize()).then(function() {});
    },
    reset_form_drawer: function() {
        $("#use_multi").addClass("fa-square-o");
        $("#use_multi").removeClass("fa-check-square");
        //reset limit apps
        $("#data-token-apps-selector").find(".check").removeClass("selected");
        $('#data-token-apps-selector .check[data-from=apps-allow]').addClass("selected");
        $("#limit_apps").css("display", "none");
        //reset limit time
        $("#data-token-exp-selector").find(".check").removeClass("selected");
        $('#data-token-exp-selector .check[data-from=time-allow]').addClass("selected");
        $('#limit_life').css('display', 'none');
        $('#select_limit_value').val("");
        $('#token_purpose').val("");
        $("#token_endpoint").val("");
        $("#create_new_token").removeClass("disabled");
    },
    add_scripts_to_table: function() {
        $('.tokenvalue').tooltipster({
            animation: "fade",
            animationDuration: 50,
            delay: 100,
            theme: 'tooltipster-borderless',
            trigger: 'custom',
            side: 'top',
            triggerOpen: {
                mouseenter: true,
                touchstart: true
            },
            triggerClose: {
                mouseleave: true,
                touchleave: true
            },
            interactive: true,
            functionBefore: function(instance) {
                instance.content("<span class='copy-tokenvalue' >" + jQuery.i18n.map["token_manager.copy-token"] + "<span>");
            },
            contentAsHTML: true,
            functionInit: function(instance) {
                instance.content("<span class='copy-tokenvalue' >" + jQuery.i18n.map["token_manager.copy-token"] + "<span>");
            }
        });
    },
    renderCommon: function(isRefresh) {
        //provide template data
        this.templateData = {"page-title": jQuery.i18n.map["token_manager.page-title"], "purpose-desc": jQuery.i18n.map["token_manager.table.purpose-desc"], "enter-number": jQuery.i18n.map["token_manager.table.enter-number"]};
        //def values for all fields
        var tableData = countlyTokenManager.getData();
        //this.configsData = countlyWhiteLabeling.getData();
        for (var i = 0; i < tableData.length; i++) {
            if (tableData[i]._id === countlyGlobal.auth_token) {
                tableData.splice(i, 1);
            }
        }
        var self = this;
        if (!isRefresh) {
            //set data
            $(this.el).html(this.template(this.templateData));
            $(".widget").after(self.form_drawer);
            app.localize($("#create-token-drawer"));

            //add apps
            var apps = [];
            for (var appId in countlyGlobal.apps) {
                apps.push({value: appId, name: countlyGlobal.apps[appId].name});
            }
            $("#multi-app-dropdown").clyMultiSelectSetItems(apps);
            $("#multi-app-dropdown").on("cly-multi-select-change", function() {
                $("#export-widget-drawer").trigger("data-updated");
            });

            this.dtable = $('#data-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": tableData,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("data-id", aData._id);
                    //$(nRow).attr("data-name", aData.report_name || aData.name || '-');
                },
                "aoColumns": [
                    {
                        "mData": function(row) {
                            var retv = row._id || "-"; var retp = row.purpose || "-"; return retp + '<span class="tokenvalue_wrapper"><input class="tokenvalue" type="text" value="' + retv + '" /></span>';
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.purpose"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            if (row.ttl) {
                                return new Date(row.ends * 1000);
                            }
                            else {
                                return jQuery.i18n.map["token_manager.table.not-expire"];
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.ends"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            return row.multi || "-";
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.multi"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            if (row.app) {
                                if (row.app.length === 0) {
                                    return jQuery.i18n.map["token_manager.table.all-apps"];
                                }
                                else {
                                    return CountlyHelpers.appIdsToNames(row.app);
                                }
                            }
                            else {
                                return jQuery.i18n.map["token_manager.table.all-apps"];
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.app"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            return row.endpoint || "-";
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.endpoint"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            if (row.ttl && ((row.ends * 1000) - Date.now()) < 0) {
                                return '<span class="token_status_dot"></span>' + jQuery.i18n.map["token_manager.table.status-expired"];
                            }
                            else {
                                return '<span class="token_status_dot token_status_dot_green"></span>' + jQuery.i18n.map["token_manager.table.status-active"];
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.status"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function() {
                            return '<a class="cly-list-options"></a>';
                        },
                        "sType": "string",
                        "sTitle": "",
                        "sClass": "shrink center",
                        bSortable: false
                    }
                ]
            }));

            self.add_scripts_to_table();

            $(document).on("click", ".tokenvalue", function() {
                $(this).select();
                document.execCommand("copy");
                var val = $(this).val();
                $('.tokenvalue').tooltipster('content', "<span class='copy-tokenvalue' data-value='" + val + "'>" + jQuery.i18n.map["token_manager.token-coppied"] + "<span>");
            });
            $(this.el).append('<div class="cly-button-menu token-menu" tabindex="1"><a class="item delete-token" data-localize="token_manager.table.delete-token"></a></div>');
            this.dtable.stickyTableHeaders();
            CountlyHelpers.initializeTableOptions();

            $(".cly-button-menu").on("cly-list.click", function(event, data) {
                var id = $(data.target).parents("tr").data("id");
                if (id) {
                    $(".token-menu").find(".delete-token").data("id", id);
                }
            });

            $(".cly-button-menu").on("cly-list.item", function(event, data) {
                var el = $(data.target);
                var value = el.data("id");
                if (value) {
                    CountlyHelpers.confirm(jQuery.i18n.map["token_manager.delete-token-confirm"], "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        var overlay = $("#overlay").clone();
                        $("body").append(overlay);
                        overlay.show();
                        countlyTokenManager.deleteToken(value, function(err) {
                            overlay.hide();
                            if (err) {
                                CountlyHelpers.alert(jQuery.i18n.map["token_manager.delete-error"], "red");
                            }
                            self.refresh(true);
                        });
                    }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["token_manager.yes-delete-token"]], { title: jQuery.i18n.map["token_manager.delete-token-confirm-title"], image: "delete-token" });
                }
            });

            $("#show_token_form").on("click", function() {
                $(".cly-drawer").removeClass("open editing");
                self.reset_form_drawer();
                $("#create-token-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function() {
                    $(this).parents(".cly-drawer").removeClass("open");
                });
            });

            //multi checkbox
            $("#use_multi").on("click", function() {
                var isChecked = $(this).hasClass("fa-check-square");//is now checked
                if (isChecked) {
                    $(this).addClass("fa-square-o");
                    $(this).removeClass("fa-check-square");
                }
                else {
                    $(this).removeClass("fa-square-o");
                    $(this).addClass("fa-check-square");
                }
            });

            //restrict by apps checkbox    
            $("#data-token-apps-selector").off("click").on("click", ".check", function() {
                $("#data-token-apps-selector").find(".check").removeClass("selected");
                $(this).addClass("selected");

                if ($(this).attr('data-from') === 'apps-limit') {
                    $('#limit_apps').css('display', 'block');
                }
                else {
                    $('#limit_apps').css('display', 'none');
                }
                $("#export-widget-drawer").trigger("data-updated");
            });

            //restrict lifetime radio
            $("#data-token-exp-selector").off("click").on("click", ".check", function() {
                $("#data-token-exp-selector").find(".check").removeClass("selected");
                $(this).addClass("selected");

                if ($(this).attr('data-from') === 'time-limit') {
                    $('#limit_life').css('display', 'block');
                }
                else {
                    $('#limit_life').css('display', 'none');
                }
                $("#export-widget-drawer").trigger("data-updated");
            });

            var myarr = [{value: "h", name: jQuery.i18n.map["token_manager.limit.h"]}, {value: "d", name: jQuery.i18n.map["token_manager.limit.d"]}, {value: "m", name: jQuery.i18n.map["token_manager.limit.m"]}];

            $("#select_limit_span").clySelectSetItems(myarr);
            $("#select_limit_number").on("cly-select-change", function() {
                $("#export-widget-drawer").trigger("data-updated");
            });

            $("#create_new_token").on("click", function() {
                var purpose = $("#token_purpose").val();
                var endpoint = [];
                var lines = $("#token_endpoint").val().split('\n');
                for (var j = 0; j < lines.length; j++) {
                    if (lines[j] !== "") {
                        endpoint.push(lines[j]);
                    }
                }
                endpoint = endpoint.join(",");
                var multi = $("#use_multi").hasClass("fa-check-square");
                var apps_list = [];
                var ttl = 0;

                var set1 = $("#data-token-apps-selector .selected").first();
                if (set1 && set1.attr('data-from') === 'apps-limit') {
                    apps_list = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                    if (apps_list.length === 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["token_manager.select-apps-error"], "red");
                        return;
                    }
                    apps_list = apps_list.join();
                }

                set1 = $("#data-token-exp-selector .selected").first();
                if (set1 && set1.attr('data-from') === 'time-limit') {
                    var spans = {"h": 3600, "d": 3600 * 24, "m": 3600 * 24 * 30};
                    var val = $("#select_limit_span").clySelectGetSelection();
                    ttl = spans[val];
                    ttl = ttl * parseInt($("#select_limit_value").val());
                    if (!ttl || ttl <= 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["token_manager.select-expire-error"], "red");
                        return;
                    }

                }
                countlyTokenManager.createToken(purpose, endpoint, multi, apps_list, ttl, function(err) {
                    if (err) {
                        CountlyHelpers.alert(jQuery.i18n.map["token_manager.delete-error"], "red");
                    }
                    $("#create-token-drawer").removeClass("open");
                    self.refresh(true);
                });
            });
        }
    },
    //here we need to refresh data
    refresh: function(dataChanged) {
        var self = this;
        if (dataChanged) {
            $.when(countlyTokenManager.initialize()).then(function() {
                var tableData = countlyTokenManager.getData();
                for (var i = 0; i < tableData.length; i++) {
                    if (tableData[i]._id === countlyGlobal.auth_token) {
                        tableData.splice(i, 1);
                    }
                }
                CountlyHelpers.refreshTable(self.dtable, tableData);
                self.add_scripts_to_table();
            });
        }
    }
});

//register views
app.sessionView = new SessionView();
app.userView = new UserView();
app.loyaltyView = new LoyaltyView();
app.countriesView = new CountriesView();
app.frequencyView = new FrequencyView();
app.deviceView = new DeviceView();
app.platformView = new PlatformView();
app.appVersionView = new AppVersionView();
app.carrierView = new CarrierView();
app.resolutionView = new ResolutionView();
app.durationView = new DurationView();
app.manageAppsView = new ManageAppsView();
app.manageUsersView = new ManageUsersView();
app.eventsView = new EventsView();
app.dashboardView = new DashboardView();
app.eventsBlueprintView = new EventsBlueprintView();
app.eventsOverviewView = new EventsOverviewView();
app.longTaskView = new LongTaskView();
app.DownloadView = new DownloadView();
app.TokenManagerView = new TokenManagerView();
app.VersionHistoryView = new VersionHistoryView();

app.route("/analytics/sessions", "sessions", function() {
    this.renderWhenReady(this.sessionView);
});
app.route("/analytics/users", "users", function() {
    this.renderWhenReady(this.userView);
});
app.route("/analytics/loyalty", "loyalty", function() {
    this.renderWhenReady(this.loyaltyView);
});
app.route("/analytics/countries", "countries", function() {
    this.renderWhenReady(this.countriesView);
});
app.route("/analytics/frequency", "frequency", function() {
    this.renderWhenReady(this.frequencyView);
});
app.route("/analytics/devices", "devices", function() {
    this.renderWhenReady(this.deviceView);
});
app.route("/analytics/platforms", "platforms", function() {
    this.renderWhenReady(this.platformView);
});
app.route("/analytics/versions", "versions", function() {
    this.renderWhenReady(this.appVersionView);
});
app.route("/analytics/carriers", "carriers", function() {
    this.renderWhenReady(this.carrierView);
});
app.route("/analytics/resolutions", "resolutions", function() {
    this.renderWhenReady(this.resolutionView);
});
app.route("/analytics/durations", "durations", function() {
    this.renderWhenReady(this.durationView);
});
app.route("/manage/apps", "manageApps", function() {
    this.renderWhenReady(this.manageAppsView);
});
app.route("/manage/users", "manageUsers", function() {
    this.manageUsersView._id = null;
    this.renderWhenReady(this.manageUsersView);
});
app.route('/manage/users/:id', 'manageUsersId', function(id) {
    this.manageUsersView._id = id;
    this.renderWhenReady(this.manageUsersView);
});
app.route("/manage/tasks", "longTasks", function() {
    this.renderWhenReady(this.longTaskView);
});
app.route("/analytics/events", "events", function() {
    this.renderWhenReady(this.eventsView);
});

app.route('/exportedData/AppUserExport/:task_id', 'userExportTask', function(task_id) {
    this.DownloadView.task_id = task_id;
    this.renderWhenReady(this.DownloadView);
});

app.route('/manage/token_manager', 'token_manager', function() {
    this.renderWhenReady(this.TokenManagerView);
});
app.route('/versions', 'version_history', function() {
    this.renderWhenReady(this.VersionHistoryView);
});

app.route("/analytics/events/:subpageid", "events", function(subpageid) {
    this.eventsView.subpageid = subpageid;
    if (subpageid === 'blueprint') {
        if (countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.indexOf(countlyCommon.ACTIVE_APP_ID) > -1) {
            this.renderWhenReady(this.eventsBlueprintView);
        }
        else {
            app.navigate("/analytics/events", true);
        }
    }
    else if (subpageid === 'overview') {
        this.renderWhenReady(this.eventsOverviewView);
    }
    else {
        this.renderWhenReady(this.eventsView);
    }
});

app.addAppSwitchCallback(function(appId) {
    if (countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.indexOf(appId) > -1) {
        $('.sidebar-menu #events-submenu .events-blueprint-side-menu').css("display", "block");
    }
    else {
        $('.sidebar-menu #events-submenu .events-blueprint-side-menu').css("display", "none");
    }
});


/**to check if there are changes in event view and ask for conformation befor moving forvard
 * @returns {boolean} true - no changes, moving forward
 */
function checkIfEventViewHaveNotUpdatedChanges() {

    if (app.eventsBlueprintView && app.eventsBlueprintView.preventHashChange === true) {
        var movemeto = Backbone.history.getFragment();
        if (movemeto !== "/analytics/events/blueprint") {
            CountlyHelpers.confirm(jQuery.i18n.map["events.general.want-to-discard"], "popStyleGreen", function(result) {
                if (!result) {
                    window.location.hash = "/analytics/events/blueprint";
                }
                else {
                    app.eventsBlueprintView.preventHashChange = false;
                    window.location.hash = movemeto;
                }
            }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map['common.yes-discard']], {title: jQuery.i18n.map["events.general.want-to-discard-title"], image: "empty-icon"});
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return true;
    }
}

Backbone.history.urlChecks.push(checkIfEventViewHaveNotUpdatedChanges);


$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    //jqXHR.setRequestHeader('X-CSRFToken', csrf_token);
    if (countlyGlobal.auth_token) {
        var testurl = originalOptions.url;
        var urlParts = testurl.split('/');
        var partcn = urlParts.length - 1;

        //if url is valid+auth_token and api_key not given
        if (urlParts[partcn].indexOf('auth_token=') === -1 && urlParts[partcn].indexOf('api_key=') === -1 && urlParts[0] === '' && (urlParts[1] === 'o' || urlParts[1] === 'i')) {
            //token and key is not given in url
            //add token in header
            if (typeof (originalOptions.data) === 'string') {
                if (originalOptions.data.indexOf('auth_token=') === -1 && originalOptions.data.indexOf('api_key') === -1) {
                    jqXHR.setRequestHeader('countly-token', countlyGlobal.auth_token);
                }
            }
            else {
                jqXHR.setRequestHeader('countly-token', countlyGlobal.auth_token);
            }
        }

    }
});;/* global countlyCommon, moment, jQuery */
(function(CountlyVueComponents, $) {

    /**
     * CLY Select list VueJS component. It supports big lists and search.
     */
    CountlyVueComponents.selectList = {
        template: '<div ref="selectList" class="cly-select text-align-left" v-bind:class="{\'big-list\' : isBigList, \'disabled\' : isDisabled}" > <div class="select-inner"> <div class="text-container"> <div v-if="selectedItem" class="text" style="width:80%" v-bind:data-value="selectedItem.value"><span v-text="selectedItem.text"></span></div><div v-if="!selectedItem" class="text" style="width:80%"><span class="text-light-gray" v-text="placeholder"></span></div></div><div class="right combo"></div></div><div class="select-items square" style="width:100%;" v-bind:style="customStyle"> <div class="warning" v-if="isBigList">' + jQuery.i18n.map['drill.big-list-warning'] + '</div><div v-for="item in items" v-on:click="itemOnSelect(item)" v-bind:class="{item: item.value, group : !item.value}"> <div v-if="!item.value"><span v-text="item.name"></span></div><div v-if="item.value" v-bind:data-value="item.value" ><span v-text="item.name"></span></div></div></div></div>',
        props: {
            placeholder: { type: String, default: '' },
            selectedItem: Object,
            items: { type: Array, default: [] },
            onSelectionChange: { type: Function, required: true },
            verticleAligned: { type: Boolean, default: false },
            isBigList: { type: Boolean, default: false },
            onSearch: { type: Function },
            isDisabled: { type: Boolean, default: false}
        },
        data: function() {
            return { searchKey: "" };
        },
        methods: {
            itemOnSelect: function(item) {
                if (item.value) {
                    this.onSelectionChange(item);
                }
            },
            selectOnClick: function(element) {
                if (this.isBigList && this.onSearch) {
                    var self = this;
                    setTimeout(function() {
                        var timeout = null;

                        $(element).find('input').val(self.searchKey);
                        $(element).find('input').unbind('keyup').bind('keyup', function() {
                            if (timeout) {
                                clearTimeout(timeout);
                                timeout = null;
                            }
                            var key = $(this).val();
                            timeout = setTimeout(function() {
                                $(element).find('.select-items').prepend("<div class='table-loader' style='top:-1px'></div>");
                                self.searchKey = key;
                                self.onSearch(key);
                            }, 1000);
                        });
                    });
                }
            }
        },
        updated: function() {
            var selectListDOM = $(this.$refs.selectList);
            selectListDOM.find('.table-loader').detach();
            if (this.selectedItem) {
                selectListDOM.clySelectSetSelection(this.selectedItem.value, this.selectedItem.name);
            }

            selectListDOM.unbind('click').bind("click", this.selectOnClick.bind(this, selectListDOM));

            //For move items to slimscroll area after search event;
            if (selectListDOM.find('.select-items').is(':visible') && selectListDOM.find('.warning').is(':visible')) {
                selectListDOM.find('.item').each(function() {
                    var item = $(this);
                    item.removeClass('hidden');
                    item.detach();
                    item.insertAfter(selectListDOM.find('.warning'));
                });
            }
        },
        mounted: function() {
            if (this.selectedItem) {
                $(this.$refs.selectList).clySelectSetSelection(this.selectedItem.value, this.selectedItem.name);
            }

            $(this.$refs.selectList).unbind('click').bind("click", this.selectOnClick.bind(this, $(this.$refs.selectList)));
        },
        computed: {
            customStyle: function() {
                if (this.verticleAligned) {
                    switch (this.items.length) {
                    case 0:
                    case 1:
                    case 2:
                        return { top: "-15px", minHeight: 'auto', position: "absolute" };
                    case 3:
                    case 4:
                        return { top: "-40px", minHeight: 'auto', position: "absolute" };
                    case 5:
                    case 6:
                        return { top: "-70px", minHeight: 'auto', position: "absolute" };
                    default:
                        return { top: "27px", minHeight: 'auto', position: "absolute" };
                    }
                }
                else {
                    return {};
                }
            }
        }
    };

    /**
     * CLY Input. (Text and number html input)
     */
    CountlyVueComponents.input = {
        template: '<input v-bind:type="inputType" v-bind:placeholder="placeholder" class="string-input disabled" v-bind:value="value" v-on:keyup="onChange">',
        props: { placeholder: { type: String, default: 'String' }, inputType: { type: String, default: 'text' }, value: { default: null }, onValueChanged: { type: Function } },
        methods: {
            onChange: function(e) {
                if (this.onValueChanged) {
                    this.onValueChanged({
                        value: this.inputType.toLowerCase() === "number" ? parseInt(e.target.value) : e.target.value,
                        type: this.inputType.toLowerCase() === "number" ? "inputnumber" : "inputtext"
                    });
                }
            }
        }
    };


    /**
     * CLY Date Picker
     */
    CountlyVueComponents.datePicker = {
        template: '<div ref="datePicker" class="date-picker-component"><input type="text" placeholder="Date" class="string-input date-value" readonly v-on:click="onClick" v-bind:value="formatDate"><div class="date-picker" style="display:none"><div class="calendar-container calendar-light"><div class="calendar"></div></div></div></div>',
        props: { placeholder: { type: String, default: 'Date' }, value: { default: null }, onValueChanged: { type: Function, required: true }, maxDate: Date },
        computed: {
            formatDate: function() {
                if (this.value) {
                    return countlyCommon.formatDate(moment(this.value * 1000), "DD MMMM, YYYY");
                }
                else {
                    return null;
                }
            }
        },
        mounted: function() {

            var datePickerDOM = $(this.$refs.datePicker).find('.date-picker');

            var self = this;
            datePickerDOM.find(".calendar").datepicker({
                numberOfMonths: 1,
                showOtherMonths: true,
                onSelect: function(selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
                        currMoment = moment(date);

                    var selectedTimestamp = moment(currMoment.format("DD MMMM, YYYY"), "DD MMMM, YYYY").unix();
                    var tzCorr = countlyCommon.getOffsetCorrectionForTimestamp(selectedTimestamp);
                    var selectedValue = selectedTimestamp - tzCorr;

                    self.onValueChanged({
                        value: selectedValue,
                        type: 'datepicker'
                    });
                    $(".date-picker").hide();
                }
            });

            if (this.maxDate) {
                datePickerDOM.find(".calendar").datepicker('option', 'maxDate', this.maxDate);
            }

            $.datepicker.setDefaults($.datepicker.regional[""]);
            datePickerDOM.find(".calendar").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

            if (this.value) {
                datePickerDOM.find(".calendar").datepicker("setDate", moment(this.value * 1000).toDate());
            }

            datePickerDOM.click(function(e) {
                e.stopPropagation();
            });
        },
        updated: function() {
            var datePickerDOM = $(this.$refs.datePicker).find('.date-picker');
            if (this.value) {
                datePickerDOM.find(".calendar").datepicker("setDate", moment(this.value * 1000).toDate());
            }
            if (this.maxDate) {
                datePickerDOM.find(".calendar").datepicker('option', 'maxDate', this.maxDate);
            }
        },
        methods: {
            onClick: function(e) {
                $(".date-picker").hide();

                $(this.$refs.datePicker).find(".date-picker").show();

                e.stopPropagation();
            }
        }
    };

}(window.CountlyVueComponents = window.CountlyVueComponents || {}, jQuery));;/* global countlyCommon, countlyGlobal, jQuery*/
(function(countlyTokenManager, $) {
    //we will store our data here
    var _data = {};
    //Initializing model
    countlyTokenManager.initialize = function() {
        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/token/list",
            data: {
                //providing current user's api key
                "api_key": countlyGlobal.member.api_key
            },
            success: function(json) {
                //got our data, let's store it
                _data = json.result;
            },
            error: function() {
                //empty
            }
        });
    };
    //return data that we have
    countlyTokenManager.getData = function() {
        return _data;
    };

    countlyTokenManager.createToken = function(purpose, endpoint, multi, apps, ttl, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/token/create",
            data: {
                //providing current user's api key
                "api_key": countlyGlobal.member.api_key,
                "purpose": purpose,
                "endpoint": endpoint,
                "multi": multi,
                "apps": apps,
                "ttl": ttl
            },
            success: function(json) {
                //token created
                callback(null, json);
            },
            error: function(xhr, status, error) {
                callback(error);
            }
        });
    };
    countlyTokenManager.deleteToken = function(id, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/token/delete",
            data: {
                //providing current user's api key
                "api_key": countlyGlobal.member.api_key,
                "tokenid": id
            },
            success: function() {
                callback(null, true);
            },
            error: function(xhr, status, error) {
                callback(error);
            }
        });
    };

}(window.countlyTokenManager = window.countlyTokenManager || {}, jQuery));;/* global countlyCommon, countlyGlobal, jQuery */
(function(countlyVersionHistoryManager, $) {
    //we will store our data here
    var _data = [];
    //Initializing model
    countlyVersionHistoryManager.initialize = function() {
        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/countly_version",
            data: {
                //providing current user's api key
                "api_key": countlyGlobal.member.api_key
            },
            success: function(json) {
                //got our data, let's store it
                _data = json.result;
            },
            error: function(/*exception*/) {}
        });
    };
    //return data that we have
    countlyVersionHistoryManager.getData = function() {
        return _data;
    };
}(window.countlyVersionHistoryManager = window.countlyVersionHistoryManager || {}, jQuery));