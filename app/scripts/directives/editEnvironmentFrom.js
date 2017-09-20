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
      addRowLink: '@',
      entries: '=',
      envFromSelectorOptions: '<',
      selectorPlaceholder: '@'
    },
    templateUrl: 'views/directives/edit-environment-from.html'
  });

  function EditEnvironmentFrom($attrs,
                               $filter,
                               utils) {
    var ctrl = this;

    var canI = $filter('canI');
    var humanizeKind = $filter('humanizeKind');

    ctrl.$id = _.uniqueId();
    ctrl.setFocusClass = 'edit-environment-from-set-focus-' + ctrl.$id;

    var addEntry = function(entries, entry) {
      entries && entries.push(entry || {});
    };

    ctrl.onAddRow = function() {
      addEntry(ctrl.envFromEntries);
      utils.setFocusOn('.'+ ctrl.setFocusClass);
    };

    ctrl.deleteEntry = function(start, deleteCount) {
      if(ctrl.entries && !ctrl.entries.length) {
        return;
      }

      ctrl.envFromEntries.splice(start, deleteCount);
      if(!ctrl.envFromEntries.length && ctrl.addRowLink) {
        addEntry(ctrl.envFromEntries);
      }

      ctrl.updateEntries(ctrl.envFromEntries);
      ctrl.editEnvironmentFromForm.$setDirty();
    };

    ctrl.isEnvFromReadonly = function(entry) {
      return ctrl.isReadonlyAny ||
        entry.isReadonlyValue === true ||
        ((entry.secretRef || entry.configMapRef) && !entry.selectedEnvFrom) ||
        _.isEmpty(ctrl.envFromSelectorOptions);
    };

    ctrl.groupByKind = function(object) {
      return humanizeKind(object.kind);
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

    ctrl.updateEnvFromEntries = function(entries) {
      ctrl.envFromEntries = entries || [];

      if(!ctrl.envFromEntries.length) {
        addEntry(ctrl.envFromEntries);
      }

      _.each(ctrl.envFromEntries, function(entry) {
        if(entry) {
          if (entry.configMapRef) {
            entry.isReadonlyValue = !canI('configmaps', 'get');
          }

          if (entry.secretRef) {
            entry.isReadonlyValue = !canI('secrets', 'get');
          }
        }
      });
    };

    var getReferenceValue = function(option) {
      var referenceValue;

      switch(option.kind) {
        case 'ConfigMap':
          referenceValue = _.find(ctrl.envFromEntries, {configMapRef: {name: option.metadata.name}});
          break;
        case 'Secret':
          referenceValue = _.find(ctrl.envFromEntries, {secretRef: {name: option.metadata.name}});
          break;
      }

      return referenceValue;
    };

    ctrl.checkEntries = function(option) {
      return !!(getReferenceValue(option));
    };

    var findReferenceValueForEntries = function(entries, envFromSelectorOptions) {
      _.each(envFromSelectorOptions, function(option) {
        var referenceValue = getReferenceValue(option);

        if (referenceValue) {
          _.set(referenceValue, 'selectedEnvFrom', option);
        }
      });
    };

    angular.extend(ctrl, {
      dragControlListeners: {
        accept: function (sourceItemHandleScope, destSortableScope) {
          return sourceItemHandleScope.itemScope.sortableScope.$id === destSortableScope.$id;
        },
        orderChanged: function() {
          ctrl.editEnvironmentFromForm.$setDirty();
        }
      }
    });

    ctrl.$onInit = function() {
      ctrl.updateEnvFromEntries(ctrl.entries);
      findReferenceValueForEntries(ctrl.envFromEntries, ctrl.envFromSelectorOptions);

      if('cannotAdd' in $attrs) {
        ctrl.cannotAdd = true;
      }

      if('cannotDelete' in $attrs) {
        ctrl.cannotDeleteAny = true;
      }

      if('cannotSort' in $attrs) {
        ctrl.cannotSort = true;
      }

      if('isReadonly' in $attrs) {
        ctrl.isReadonlyAny = true;
      }

      if('showHeader' in $attrs) {
        ctrl.showHeader = true;
      }

      if(ctrl.envFromEntries && !ctrl.envFromEntries.length) {
        addEntry(ctrl.envFromEntries);
      }
    };

    ctrl.$onChanges = function(changes) {
      if(changes.entries) {
        ctrl.updateEnvFromEntries(changes.entries.currentValue);
      }

      if(changes.envFromSelectorOptions) {
        findReferenceValueForEntries(ctrl.envFromEntries, changes.envFromSelectorOptions.currentValue);
      }
    };
  }
})();

