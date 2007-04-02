/*==================================================
 *  Exhibit.OrderedViewFrame
 *==================================================
 */
 
Exhibit.OrderedViewFrame = function(uiContext) {
    this._uiContext = uiContext;
    
    this._orders = null;
    this._possibleOrders = null;
    this._settings = {};
};

Exhibit.OrderedViewFrame._settingSpecs = {
    "showAll":              { type: "boolean", defaultValue: false },
    "grouped":              { type: "boolean", defaultValue: true },
    "showDuplicates":       { type: "boolean", defaultValue: false },
    "initialCount":         { type: "int",     defaultValue: 10 }
};
    
Exhibit.OrderedViewFrame.prototype.configure = function(configuration) {
    if ("orders" in configuration) {
        this._orders = [];
        this._configureOrders(configuration.orders);
    }
    if ("possibleOrders" in configuration) {
        this._possibleOrders = [];
        this._configurePossibleOrders(configuration.possibleOrders);
    }
    
    Exhibit.SettingsUtilities.collectSettings(
        configuration, Exhibit.OrderedViewFrame._settingSpecs, this._settings);
    
    this._internalValidate();
};

Exhibit.OrderedViewFrame.prototype.configureFromDOM = function(domConfiguration) {
    var orders = Exhibit.getAttribute(domConfiguration, "orders", ",");
    if (orders != null && orders.length > 0) {
        this._orders = [];
        this._configureOrders(orders);
    }
    
    var directions = Exhibit.getAttribute(domConfiguration, "directions", ",");
    if (directions != null && directions.length > 0) {
        for (var i = 0; i < directions.length && i < this._orders.length; i++) {
            this._orders[i].ascending = (directions[i].toLowerCase() != "descending");
        }
    }
    
    var possibleOrders = Exhibit.getAttribute(domConfiguration, "possibleOrders", ",");
    if (possibleOrders != null && possibleOrders.length > 0) {
        this._possibleOrders = [];
        this._configurePossibleOrders(possibleOrders);
    }
    
    var possibleDirections = Exhibit.getAttribute(domConfiguration, "possibleDirections", ",");
    if (possibleDirections != null && possibleDirections.length > 0) {
        for (var i = 0; i < possibleDirections.length && i < this._possibleOrders.length; i++) {
            this._possibleOrders.ascending = (possibleDirections[i].toLowerCase() != "descending");
        }
    }
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(
        domConfiguration, Exhibit.OrderedViewFrame._settingSpecs, this._settings);

    this._internalValidate();
}

Exhibit.OrderedViewFrame.prototype._internalValidate = function() {
    if (this._possibleOrders == null) {
        this._possibleOrders = [
            {   property:   "label",
                forward:    true,
                ascending:  true
            }
        ];
    }
    if (this._orders == null) {
        this._orders = [
            this._possibleOrders[0]
        ];
    }
};

Exhibit.OrderedViewFrame.prototype.dispose = function() {
    this._collectionSummaryWidget.dispose();
    this._divHeader.innerHTML = "";
    this._divFooter.innerHTML = "";
    
    this._collectionSummaryWidget = null;
    this._headerDom = null;
    this._footerDom = null;
    
    this._divHeader = null;
    this._divFooter = null;
    this._uiContext = null;
};

Exhibit.OrderedViewFrame.prototype._configureOrders = function(orders) {
    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        var expr;
        var ascending = true;
        
        if (typeof order == "string") {
            expr = order;
        } else {
            expr = order.expression,
            ascending = ("ascending" in order) ? (order.ascending) : true;
        }
        
        var expression = Exhibit.Expression.parse(expr);
        if (expression.isPath()) {
            var path = expression.getPath();
            if (path.getSegmentCount() == 1) {
                var segment = path.getSegment(0);
                this._orders.push({
                    property:   segment.property,
                    forward:    segment.forward,
                    ascending:  ascending
                });
            }
        }
    }
};

Exhibit.OrderedViewFrame.prototype._configurePossibleOrders = function(possibleOrders) {
    var hasLabel = false;
    for (var i = 0; i < possibleOrders.length; i++) {
        var order = possibleOrders[i];
        var expr;
        var ascending = true;
        
        if (typeof order == "string") {
            expr = order;
        } else {
            expr = order.expression,
            ascending = ("ascending" in order) ? (order.ascending) : true;
        }
        
        var expression = Exhibit.Expression.parse(expr);
        if (expression.isPath()) {
            var path = expression.getPath();
            if (path.getSegmentCount() == 1) {
                var segment = path.getSegment(0);
                this._possibleOrders.push({
                    property:   segment.property,
                    forward:    segment.forward,
                    ascending:  ascending
                });
                
                if (segment.property == "label" && segment.forward) {
                    hasLabel = true;
                }
            }
        }
    }
    
    if (!hasLabel) {
        this._possibleOrders.push({ 
            property:   "label", 
            forward:    true, 
            ascending:  true 
        });
    }
};

Exhibit.OrderedViewFrame.prototype.initializeUI = function() {
    this._divHeader.innerHTML = "";
    this._divFooter.innerHTML = "";
    
    var self = this;
    this._headerDom = Exhibit.OrderedViewFrame.theme.createHeaderDom(
        this._uiContext.getExhibit(), 
        this._divHeader, 
        function(elmt, evt, target) {
            Exhibit.ViewPanel.resetCollection(self._collection);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        },
        function(elmt, evt, target) {
            self._openSortPopup(elmt, -1);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        },
        function(elmt, evt, target) {
            self._toggleGroup();
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        },
        function(elmt, evt, target) {
            self._toggleShowDuplicates();
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        },
        this._generatedContentElmtRetriever // HACK
    );
    this._footerDom = Exhibit.OrderedViewFrame.theme.createFooterDom(
        this._uiContext.getExhibit(), 
        this._divFooter, 
        function(elmt, evt, target) {
            self._setShowAll(true);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        },
        function(elmt, evt, target) {
            self._setShowAll(false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        }
    );
    
    this._collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create(
        {},
        this._headerDom.collectionSummaryDiv, 
        this._uiContext
    );
};

Exhibit.OrderedViewFrame.prototype.reconstruct = function() {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    
    /*
     *  Get the current collection and check if it's empty
     */
    var originalSize = collection.countAllItems();
    var currentSize = collection.countRestrictedItems();
    
    /*
     *  Set the header UI
     */
    this._headerDom.setGrouped(this._settings.grouped);
    this._headerDom.setShowDuplicates(this._settings.showDuplicates);
    
    var hasSomeGrouping = false;
    if (currentSize > 0) {
        var currentSet = collection.getRestrictedItems();
        
        hasSomeGrouping = this._internalReconstruct(currentSet);
        
        /*
         *  Build sort controls
         */
        var orderDoms = [];
        var buildOrderDom = function(order, index) {
            var property = database.getProperty(order.property);
            var orderDom = Exhibit.OrderedViewFrame.theme.createOrderDom(
                (order.forward) ? property.getPluralLabel() : property.getReversePluralLabel(),
                function(elmt, evt, target) {
                    self._openSortPopup(elmt, index);
                    SimileAjax.DOM.cancelEvent(evt);
                    return false;
                }
            );
            orderDoms.push(orderDom);
        };
        for (var i = 0; i < this._orders.length; i++) {
            buildOrderDom(this._orders[i], i);
        }
        this._headerDom.setOrders(orderDoms);
        this._headerDom.enableThenByAction(orderDoms.length < this._possibleOrders.length);
    }
    
    this._footerDom.setCounts(currentSize, this._initialCount, this._showAll, !(hasSomeGrouping && this._grouped));
};

Exhibit.OrderedViewFrame.prototype._internalReconstruct = function(allItems) {
    var self = this;
    var settings = this._settings;
    var database = this._uiContext.getDatabase();
    var orders = this._orders;
    var itemIndex = 0;
    
    var hasSomeGrouping = false;
    var createItem = function(itemID) {
        if ((hasSomeGrouping && settings.grouped) || settings.showAll || itemIndex < settings.initialCount) {
            self.onNewItem(itemID, itemIndex++);
        }
    };
    var createGroup = function(label, valueType, index) {
        if ((hasSomeGrouping && settings.grouped) || settings.showAll || itemIndex < settings.initialCount) {
            self.onNewGroup(label, valueType, index);
        }
    };
    
    var processLevel = function(items, index) {
        var order = orders[index];
        var values = order.forward ? 
            database.getObjectsUnion(items, order.property) : 
            database.getSubjectsUnion(items, order.property);
        
        var valueType = "text";
        if (order.forward) {
            var property = database.getProperty(order.property);
            valueType = property != null ? property.getValueType() : "text";
        } else {
            valueType = "item";
        }
        
        var keys = (valueType == "item" || valueType == "text") ?
            processNonNumericLevel(items, index, values, valueType) :
            processNumericLevel(items, index, values, valueType);
        
        var grouped = false;
        for (var k = 0; k < keys.length; k++) {
            if (keys[k].items.size() > 1) {
                grouped = true;
            }
        }
        //grouped = grouped && keys.length > 1;
        if (grouped) {
            hasSomeGrouping = true;
        }
        
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (key.items.size() > 0) {
                if (grouped && settings.grouped) {
                    createGroup(key.display, valueType, index);
                }
                
                items.removeSet(key.items);
                if (key.items.size() > 1 && index < orders.length - 1) {
                    processLevel(key.items, index+1);
                } else {
                    key.items.visit(createItem);
                }
            }
        }
        
        if (items.size() > 0) {
            if (grouped && settings.grouped) {
                createGroup(Exhibit.l10n.missingSortKey, valueType, index);
            }
            
            if (items.size() > 1 && index < orders.length - 1) {
                processLevel(items, index+1);
            } else {
                items.visit(createItem);
            }
        }
    };
    
    var processNonNumericLevel = function(items, index, values, valueType) {
        var keys = [];
        var compareKeys;
        var retrieveItems;
        var order = orders[index];
        
        if (valueType == "item") {
            values.visit(function(itemID) {
                var label = database.getObject(itemID, "label");
                label = label != null ? label : itemID;
                keys.push({ itemID: itemID, display: label });
            });
            
            compareKeys = function(key1, key2) {
                var c = key1.display.localeCompare(key2.display);
                return c != 0 ? c : key1.itemID.localeCompare(key2.itemID);
            };
            
            retrieveItems = order.forward ? function(key) {
                return database.getSubjects(key.itemID, order.property, null, items);
            } : function(key) {
                return database.getObjects(key.itemID, order.property, null, items);
            };
        } else { //text
            values.visit(function(value) {
                keys.push({ display: value });
            });
            
            compareKeys = function(key1, key2) {
                return key1.display.localeCompare(key2.display);
            };
            retrieveItems = order.forward ? function(key) {
                return database.getSubjects(key.display, order.property, null, items);
            } : function(key) {
                return database.getObjects(key.display, order.property, null, items);
            };
        }
        
        keys.sort(function(key1, key2) { 
            return (order.ascending ? 1 : -1) * compareKeys(key1, key2); 
        });
        
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            key.items = retrieveItems(key);
            if (!settings.showDuplicates) {
                items.removeSet(key.items);
            }
        }
        
        return keys;
    };
    
    var processNumericLevel = function(items, index, values, valueType) {
        var keys = [];
        var keyMap = {};
        var order = orders[index];
        
        var valueParser;
        if (valueType == "number") {
            valueParser = function(value) {
                if (typeof value == "number") {
                    return value;
                } else {
                    try {
                        return parseFloat(value);
                    } catch (e) {
                        return null;
                    }
                }
            };
        } else { //date
            valueParser = function(value) {
                if (value instanceof Date) {
                    return value.getTime();
                } else {
                    try {
                        return SimileAjax.DateTime.parseIso8601DateTime(value.toString()).getTime();
                    } catch (e) {
                        return null;
                    }
                }
            };
        }
        
        values.visit(function(value) {
            var sortkey = valueParser(value);
            if (sortkey != null) {
                var key = keyMap[sortkey];
                if (!key) {
                    key = { sortkey: sortkey, display: value, values: [], items: new Exhibit.Set() };
                    keyMap[sortkey] = key;
                    keys.push(key);
                }
                key.values.push(value);
            }
        });
        
        keys.sort(function(key1, key2) { 
            return (order.ascending ? 1 : -1) * (key1.sortkey - key2.sortkey); 
        });
        
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var values = key.values;
            for (var v = 0; v < values.length; v++) {
                if (order.forward) {
                    database.getSubjects(values[v], order.property, key.items, items);
                } else {
                    database.getObjects(values[v], order.property, key.items, items);
                }
            }
            
            if (!settings.showDuplicates) {
                items.removeSet(key.items);
            }
        }
        
        return keys;
    };
    
    processLevel(allItems, 0);
    
    return hasSomeGrouping;
};

Exhibit.OrderedViewFrame.prototype._openSortPopup = function(elmt, index) {
    var self = this;
    var database = this._uiContext.getDatabase();
    
    var popupDom = Exhibit.Theme.createPopupMenuDom(elmt);
    
    /*
     *  Ascending/descending/remove options for the current order
     */
    if (index >= 0) {
        var order = this._orders[index];
        var property = database.getProperty(order.property);
        var propertyLabel = order.forward ? property.getPluralLabel() : property.getReversePluralLabel();
        var valueType = order.forward ? property.getValueType() : "item";
        var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
        sortLabels = (sortLabels != null) ? sortLabels : 
            Exhibit.Database.l10n.sortLabels["text"];
        
        popupDom.appendMenuItem(
            sortLabels.ascending, 
            Exhibit.Theme.urlPrefix +
                (order.ascending ? "images/option-check.png" : "images/option.png"),
            order.ascending ?
                function() {} :
                function() {
                    self._reSort(
                        index, 
                        order.property, 
                        order.forward, 
                        true,
                        false
                    );
                }
        );
        popupDom.appendMenuItem(
            sortLabels.descending, 
            Exhibit.Theme.urlPrefix +
                (order.ascending ? "images/option.png" : "images/option-check.png"),
            order.ascending ?
                function() {
                    self._reSort(
                        index, 
                        order.property, 
                        order.forward, 
                        false,
                        false
                    );
                } :
                function() {}
        );
        if (this._orders.length > 1) {
            popupDom.appendSeparator();
            popupDom.appendMenuItem(
                Exhibit.OrderedViewFrame.l10n.removeOrderLabel, 
                null,
                function() {self._removeOrder(index);}
            );
        }
    }
    
    /*
     *  The remaining possible orders
     */
    var orders = [];
    for (var i = 0; i < this._possibleOrders.length; i++) {
        var possibleOrder = this._possibleOrders[i];
        var skip = false;
        for (var j = (index < 0) ? this._orders.length - 1 : index; j >= 0; j--) {
            var existingOrder = this._orders[j];
            if (existingOrder.property == possibleOrder.property && 
                existingOrder.forward == possibleOrder.forward) {
                skip = true;
                break;
            }
        }
        
        if (!skip) {
            var property = database.getProperty(possibleOrder.property);
            orders.push({
                property:   possibleOrder.property,
                forward:    possibleOrder.forward,
                ascending:  possibleOrder.ascending,
                label:      possibleOrder.forward ? 
                                property.getPluralLabel() : 
                                property.getReversePluralLabel()
            });
        }
    }
    
    if (orders.length > 0) {
        if (index >= 0) {
            popupDom.appendSeparator();
        }
        
        orders.sort(function(order1, order2) {
            return order1.label.localeCompare(order2.label);
        });
        
        var appendOrder = function(order) {
            popupDom.appendMenuItem(
                order.label,
                null,
                function() {
                    self._reSort(
                        index, 
                        order.property, 
                        order.forward, 
                        order.ascending,
                        true
                    );
                }
            );
        }
        
        for (var i = 0; i < orders.length; i++) {
            appendOrder(orders[i]);
        }
    }
    popupDom.open();
};

Exhibit.OrderedViewFrame.prototype._reSort = function(index, propertyID, forward, ascending, slice) {
    index = (index < 0) ? this._orders.length : index;
    
    var oldOrders = this._orders;
    var newOrders = this._orders.slice(0, index);
    newOrders.push({ property: propertyID, forward: forward, ascending: ascending });
    if (!slice) {
        newOrders = newOrders.concat(oldOrders.slice(index+1));
    }
    
    var property = this._uiContext.getDatabase().getProperty(propertyID);
    var propertyLabel = forward ? property.getPluralLabel() : property.getReversePluralLabel();
    var valueType = forward ? property.getValueType() : "item";
    var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
    sortLabels = (sortLabels != null) ? sortLabels : 
        Exhibit.Database.l10n.sortLabels["text"];
    
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            self._orders = newOrders;
            self.parentReconstruct();
        },
        function() {
            self._orders = oldOrders;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n.formatSortActionTitle(
            propertyLabel, ascending ? sortLabels.ascending : sortLabels.descending)
    );
};

Exhibit.OrderedViewFrame.prototype._removeOrder = function(index) {
    var oldOrders = this._orders;
    var newOrders = this._orders.slice(0, index).concat(this._orders.slice(index + 1));
    
    var order = oldOrders[index];
    var property = this._uiContext.getDatabase().getProperty(order.property);
    var propertyLabel = order.forward ? property.getPluralLabel() : property.getReversePluralLabel();
    var valueType = order.forward ? property.getValueType() : "item";
    var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
    sortLabels = (sortLabels != null) ? sortLabels : 
        Exhibit.Database.l10n.sortLabels["text"];
    
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            self._orders = newOrders;
            self.parentReconstruct();
        },
        function() {
            self._orders = oldOrders;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle(
            propertyLabel, order.ascending ? sortLabels.ascending : sortLabels.descending)
    );
};

Exhibit.OrderedViewFrame.prototype._setShowAll = function(showAll) {
    this._showAll = showAll;
    this.parentReconstruct();
};

Exhibit.OrderedViewFrame.prototype._toggleGroup = function() {
    var settings = this._settings;
    var oldGrouped = settings.grouped;
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.grouped = !oldGrouped;
            self.parentReconstruct();
        },
        function() {
            settings.grouped = oldGrouped;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n[
            oldGrouped ? "ungroupActionTitle" : "groupAsSortedActionTitle"]
    );
};

Exhibit.OrderedViewFrame.prototype._toggleShowDuplicates = function() {
    var settings = this._settings;
    var oldShowDuplicates = settings.showDuplicates;
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.showDuplicates = !oldShowDuplicates;
            self.parentReconstruct();
        },
        function() {
            settings.showDuplicates = oldShowDuplicates;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n[
            oldShowDuplicates ? "hideDuplicatesActionTitle" : "showDuplicatesActionTitle"]
    );
};