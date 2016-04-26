/**

 This will export the constructor for making dialogs. Just call the constructor without "new".
 Naturally bring alert & loadmask with

 *constructor*(select, option)
 *constructor*.get(index) return a dialog object created by index

 @param select
   string class selector for user-defined dialog element

 @param option object
   {
     id: string
     beforeShow: function
     beforeHide: function
     afterShow: function
     afterHide: function
     initFunc: function
     initData: [] # will be fed to initFunc, js apply is used under the hook
     btns: {
       {cancel:{label: string, callback: function}, confirm:{label: string, callback: function}}
     }
     interaction: function / [function]
   }

 @event overlay:hide
   Listen on body for "overlay:hide" -- hide the overlay popup on this event

 **/
define(["exports", "zepto"], function(exports) {
  var zOverlay = $("<div>"),
      visibleDialog = null,
      _lastVisibles = [],
      _restoreState = false,
      _pushState = false,
      dialogs = {},
      dialogElement = {};

  $("body").on("overlay:hide", function() {
    if (visibleDialog) {
      visibleDialog.hide();
    }

    visibleDialog = null;
    _lastVisibles = [];
  });

  zOverlay.addClass("modal-overlay");

  zOverlay
    .on("touchmove", function(event) {
      event.stopPropagation();
    })
    .on("touchstart", function(event) {
      var zTar = $(event.target);

      if (zTar.hasClass("btn")) {
        zTar.addClass("on-tap");
      }

      zOverlay.data("touchStartAt", event.timeStamp);
    })
    .on("click", function(event) {
      event.preventDefault(); // click through bug
    })
    .on("touchend", function(event) {
      var zTar = $(event.target),
          dialogIdx;

      if (zTar.hasClass("btn") && zTar.hasClass("on-tap")) {
        zTar.removeClass("on-tap");

        if (event.timeStamp - zOverlay.data("touchStartAt") < 1000) {
          var dlg = visibleDialog; // hide first will null the visibleDialog

          if (zTar.hasClass('cancel')) {
            visibleDialog.hide();

            if (typeof dlg.onCancel !== 'undefined' && !! dlg.onCancel) {
              dlg.onCancel();
            }

            if (dlg.selector === 'alert') {
              dlg.onCancel = null;
            }
          } else if (zTar.hasClass('confirm')) {
            if (typeof dlg.onConfirm !== 'undefined' && !! dlg.onConfirm) {
              dlg.onConfirm();
            }

            if (dlg.selector === 'alert') {
              dlg.onConfirm = null;
            }
          }
        }

        zOverlay.removeData("touchStartAt");
      }
    });

  function init() {
    var defaultDialogs = ["alert", "loadmask"],
        zEle = null,
        conf = null;

    for (var item in defaultDialogs) {
      conf = {};
      conf.id = defaultDialogs[item];

      switch (defaultDialogs[item]) {
      case 'alert':
        zEle = $('<div class="dialog alert"><div class="title"></div><div class="info"></div></div>');
        conf.beforeShow = function() {
          var getType = Object.prototype.toString;
          if (typeof this.alertTitle !== 'undefined' && getType.call(this.alertTitle) === '[object String]') {
            dialogElement['alert'].children(".title").html(this.alertTitle).show();
          } else {
            dialogElement['alert'].children(".title").hide();
          }

          if (typeof this.alertMessage !== 'undefined' && getType.call(this.alertMessage) === '[object String]') {
            dialogElement['alert'].children(".info").html(this.alertMessage).show();
          } else {
            dialogElement['alert'].children(".info").hide();
          }
        };
        conf.btns = {
          'cancel': {
            'label': '确定'
          }
        };
        break;
      case 'loadmask':
        zEle = $('<div class="loading"></div>');
        break;
      }

      new constructor(zEle, conf);
    }
  }

  function constructor(eleSelector, config) {
    var idx = eleSelector,
        zEle;

    if (Object.prototype.toString.call(eleSelector) === "[object Object]") {
      idx = config.id;
    }

    if (dialogs[idx]) {
      return dialogs[idx];
    }

    zEle = $(eleSelector);

    if (! zEle) {
      return null;
    }

    zEle.data("index", idx);
    dialogElement[idx] = zEle;

    function Dialog(config) {
      this.selector = idx;
      this.element = zEle;
      this.onCancel = null;
      this.onConfirm = null;

      if (typeof config !== "undefined" && !! config) {
        this.beforeHide = config.beforeHide ? config.beforeHide : null;
        this.beforeShow = config.beforeShow ? config.beforeShow : null;
        this.afterShow = config.afterShow ? config.afterShow : null;
        this.afterHide = config.afterHide ? config.afterHide : null;
        this.interaction = config.interaction ? config.interaction : [];
      }

      var btns = '<div class="btns">{}btns{}</div>',
          cancelBtn = '<div class="btn cancel">{}cancelLabel{}</div>',
          confirmBtn = '<div class="btn confirm">{}confirmLabel{}</div>',
          btnBuf = [],
          cancelLabel,
          confirmLabel;

      if (idx === "loadmask") {
        zEle.append(btns.replace("{}btns{}", ''));
      } else if (typeof config === 'undefined') {
        zEle.append(btns.replace('{}btns{}', cancelBtn.replace('{}cancelLabel{}', "确定")));
      } else {
        if (typeof config.initFunc !== 'undefined'
            && Object.prototype.toString.call(config.initFunc) === '[object Function]') {
          config.initFunc.apply(this, config.initData);
        }

        if (typeof config.btns !== "undefined" && config.btns) {
          if (typeof config.btns.cancel !== "undefined" && config.btns.cancel) {
            cancelLabel = config.btns.cancel.label ? config.btns.cancel.label : '取消';
            btnBuf.push(cancelBtn.replace('{}cancelLabel{}', cancelLabel));

            if (config.btns.cancel.callback) {
              this.onCancel = config.btns.cancel.callback;
            }
          }

          if (typeof config.btns.confirm !== "undefined" && config.btns.confirm) {
            confirmLabel = config.btns.confirm.label ? config.btns.confirm.label : '确认';
            btnBuf.push(confirmBtn.replace('{}confirmLabel{}', confirmLabel));

            if (config.btns.confirm.callback) {
              this.onConfirm = config.btns.confirm.callback;
            }
          }

          zEle.append(btns.replace('{}btns{}', btnBuf.join("")));
        }

        if (this.interaction) {
          if (Object.prototype.toString.call(this.interaction) === '[object Array]') {
            for (var i in this.interaction) {
              this.interaction[i].call(this);
            }
          } else if (Object.prototype.toString.call(this.interaction) === '[object Function]') {
            this.interaction.call(this);
          }
        }
      }
    }

    /**
     base call to show the dialog
     **/
    function _show() {
      $("body").css({"overflow": "hidden"});
      zOverlay.append(this);
      zOverlay.appendTo('body');
    }

    /**
     base call to hide the dialog
     **/
    function _hide() {
      $("body").css({"overflow": "auto"});
      zOverlay.remove();
      this.remove();
    }

    Dialog.prototype = {
      "show": function() {
        var zDialogElement = dialogElement[this.selector];

        if (this.beforeShow) {
          this.beforeShow();
        }

        if (! _restoreState && !! visibleDialog) {
          if (visibleDialog.selector !== "alert" && visibleDialog.selector !== "loadmask") {
            _lastVisibles.push(visibleDialog);
            _pushState = true;
          }

          visibleDialog.hide();
        }

        _show.call(zDialogElement);
        visibleDialog = this;

        if (this.afterShow) {
          this.afterShow();
        }

        _restoreState = false;
      },

      "hide": function() {
        var zDialogElement = dialogElement[this.selector];

        if (this.beforeHide) {
          this.beforeHide();
        }

        _hide.call(zDialogElement);

        if (! _pushState) {
          if (_lastVisibles.length === 0) {
            visibleDialog = null;
          } else if (_lastVisibles[_lastVisibles.length - 1] == visibleDialog) {
            _lastVisibles.pop();
            visibleDialog = _lastVisibles.pop();

            if (!! visibleDialog) {
              _restoreState = true;
            }
          } else {
            visibleDialog = _lastVisibles.pop();
            _restoreState = true;
          }

          if (this.afterHide) {
            this.afterHide();
          }

          if (!! visibleDialog) {
            visibleDialog.show();
          }
        }

        _pushState = false;
      },

      "isVisible": function() {
        if (! visibleDialog) {
          return false;
        }

        return visibleDialog.selector === this.selector;
      }
    };

    dialogs[idx] = new Dialog(config);

    return dialogs[idx];
  }

  constructor.get = function(id) {
    return dialogs[id];
  };

  constructor.getElement = function(id) {
    return dialogElement[id];
  };

  init();

  return constructor; // module exports
});
