"use strict";
(function() {
  angular.module("openshiftConsole").component('editEnvironmentFrom', {
    controller: [
      '$attrs',
      '$filter',
      'keyValueEditorUtils',
      EditEnvironmentFrom
    ],
    bindings: {
      addRowLink: '@',              // creates a link to "add row" and sets its text label
      entries: '=',                 // an array of objects containing configmaps and secrets
      envFromSelectorOptions: '<',  // dropdown selector options, an array of objects
      selectorPlaceholder: '@',     // placeholder copy for dropdown selector
      isReadonly: '<?'              // display as read only values
    },
    templateUrl: 'views/directives/edit-environment-from.html'
  });

  function EditEnvironmentFrom($attrs,
                               $filter,
                               utils) {
    var ctrl = this;
    var canI = $filter('canI');
    var humanizeKind = $filter('humanizeKind');
    var uniqueId = _.uniqueId();

    ctrl.setFocusClass = 'edit-environment-from-set-focus-' + uniqueId;

    ctrl.viewOverlayPanel = function(entry) {
      ctrl.overlayPaneEntryDetails = entry;
      ctrl.overlayPanelVisible = true;
    };

    ctrl.closeOverlayPanel = function() {
      ctrl.overlayPanelVisible = false;
    };

    var addEntry = function(entries, entry) {
      entries && entries.push(entry || {});
    };

    ctrl.onAddRow = function() {
      addEntry(ctrl.envFromEntries);
      utils.setFocusOn('.'+ ctrl.setFocusClass);
    };

    ctrl.deleteEntry = function(start, deleteCount) {
      if(ctrl.envFromEntries && !ctrl.envFromEntries.length) {
        return;
      }

      ctrl.envFromEntries.splice(start, deleteCount);

      if(!ctrl.envFromEntries.length && ctrl.addRowLink) {
        addEntry(ctrl.envFromEntries);
      }

      ctrl.updateEntries(ctrl.envFromEntries);
      ctrl.editEnvironmentFromForm.$setDirty();
    };

    ctrl.hasOptions = function() {
      return !_.isEmpty(ctrl.envFromSelectorOptions);
    };

    ctrl.hasEntries = function() {
      return angular.toJson(ctrl.entries) !== '[{}]' && ctrl.entries && ctrl.entries.length >= 1;
    };

    ctrl.isEnvFromReadonly = function(entry) {
      return ctrl.isReadonly === true || entry && entry.isReadonly === true;
    };

    ctrl.groupByKind = function(object) {
      return humanizeKind(object.kind);
    };

    ctrl.dragControlListeners = {
      accept: function (sourceItemHandleScope, destSortableScope) {
        return sourceItemHandleScope.itemScope.sortableScope.$id === destSortableScope.$id;
      },
      orderChanged: function() {
        ctrl.editEnvironmentFromForm.$setDirty();
      }
    };

    ctrl.envFromObjectSelected = function(index, entry, selected) {
      var newEnvFrom = {};

      switch (selected.kind) {
        case 'Secret':
          newEnvFrom.secretRef = {
            name: selected.metadata.name
          };
          delete ctrl.envFromEntries[index].configMapRef;
          break;
        case 'ConfigMap':
          newEnvFrom.configMapRef = {
            name: selected.metadata.name
          };
          delete ctrl.envFromEntries[index].secretRef;
          break;
      }

      _.assign(ctrl.envFromEntries[index], newEnvFrom);
      ctrl.updateEntries(ctrl.envFromEntries);
    };

    ctrl.updateEntries = function(entries) {
      ctrl.entries = _.filter(entries, function (val) {
        return val.secretRef || val.configMapRef;
      });
    };

    var getReferenceValues = function(option) {
      var kindRef = _.camelCase(option.kind) + 'Ref';
      return _.filter(ctrl.envFromEntries, [kindRef, {name:option.metadata.name}]);
    };

    var updateEnvFromEntries = function() {
      ctrl.envFromEntries = ctrl.entries || [];

      if(!ctrl.envFromEntries.length) {
        addEntry(ctrl.envFromEntries);
      }

      _.each(ctrl.envFromEntries, function(entry) {
        if(entry) {
          if(entry.configMapRef && !canI('configmaps', 'get')) {
            entry.isReadonly = true;
          }

          if(entry.secretRef && !canI('secrets', 'get')) {
            entry.isReadonly = true;
          }
        }
      });

      _.each(ctrl.envFromSelectorOptions, function(option) {
        _.each(getReferenceValues(option), function(val, i) {
          _.set(val, 'selectedEnvFrom', option);

          if (i > 0) {
            _.set(val, 'duplicateEnvFrom', true);
          }
        });
      });
    };

    ctrl.$onInit = function() {
      updateEnvFromEntries();

      if('cannotDelete' in $attrs) {
        ctrl.cannotDeleteAny = true;
      }

      if('cannotSort' in $attrs) {
        ctrl.cannotSort = true;
      }

      if('showHeader' in $attrs) {
        ctrl.showHeader = true;
      }

      if(ctrl.envFromEntries && !ctrl.envFromEntries.length) {
        addEntry(ctrl.envFromEntries);
      }
    };

    ctrl.$onChanges = function(changes) {
      if(changes.entries || changes.envFromSelectorOptions) {
        updateEnvFromEntries();
      }
    };
  }
})();

