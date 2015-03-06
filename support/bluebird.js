/* @preserve
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Petka Antonov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
/**
 * bluebird build version 2.9.12
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, using, timers, filter, any, each
 */
!function (e) {
    if ("object" == typeof exports && "undefined" != typeof module)module.exports = e(); else if ("function" == typeof define && define.amd)define([], e); else {
        var f;
        "undefined" != typeof window ? f = window : "undefined" != typeof global ? f = global : "undefined" != typeof self && (f = self), f.Promise = e()
    }
}(function () {
    var define, module, exports;
    return (function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof _dereq_ == "function" && _dereq_;
                    if (!u && a)return a(o, !0);
                    if (i)return i(o, !0);
                    var f = new Error("Cannot find module '" + o + "'");
                    throw f.code = "MODULE_NOT_FOUND", f
                }
                var l = n[o] = {exports: {}};
                t[o][0].call(l.exports, function (e) {
                    var n = t[o][1][e];
                    return s(n ? n : e)
                }, l, l.exports, e, t, n, r)
            }
            return n[o].exports
        }

        var i = typeof _dereq_ == "function" && _dereq_;
        for (var o = 0; o < r.length; o++)s(r[o]);
        return s
    })({
        1: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise) {
                var SomePromiseArray = Promise._SomePromiseArray;

                function any(promises) {
                    var ret = new SomePromiseArray(promises);
                    var promise = ret.promise();
                    ret.setHowMany(1);
                    ret.setUnwrap();
                    ret.init();
                    return promise;
                }

                Promise.any = function (promises) {
                    return any(promises);
                };

                Promise.prototype.any = function () {
                    return any(this);
                };

            };

        }, {}],
        2: [function (_dereq_, module, exports) {
            "use strict";
            var firstLineError;
            try {throw new Error(); } catch (e) {firstLineError = e;}
            var schedule = _dereq_("./schedule");
            var Queue = _dereq_("./queue");

            function Async() {
                this._isTickUsed = false;
                this._lateQueue = new Queue(16);
                this._normalQueue = new Queue(16);
                this._haveDrainedQueues = false;
                var self = this;
                this.drainQueues = function () {
                    self._drainQueues();
                };
                this._schedule =
                    schedule.isStatic ? schedule(this.drainQueues) : schedule;
            }

            Async.prototype.haveItemsQueued = function () {
                return this._isTickUsed || this._haveDrainedQueues;
            };

            Async.prototype.fatalError = function (e, isNode) {
                if (isNode) {
                    process.stderr.write("Fatal " + (e instanceof Error ? e.stack : e));
                    process.exit(2);
                } else {
                    this.throwLater(e);
                }
            };

            Async.prototype.throwLater = function (fn, arg) {
                if (arguments.length === 1) {
                    arg = fn;
                    fn = function () { throw arg; };
                }
                if (typeof setTimeout !== "undefined") {
                    setTimeout(function () {
                        fn(arg);
                    }, 0);
                } else try {
                    this._schedule(function () {
                        fn(arg);
                    });
                } catch (e) {
                    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
                }
            };

            Async.prototype.invokeLater = function (fn, receiver, arg) {
                this._lateQueue.push(fn, receiver, arg);
                this._queueTick();
            };

            Async.prototype.invokeFirst = function (fn, receiver, arg) {
                this._normalQueue.unshift(fn, receiver, arg);
                this._queueTick();
            };

            Async.prototype.invoke = function (fn, receiver, arg) {
                this._normalQueue.push(fn, receiver, arg);
                this._queueTick();
            };

            Async.prototype.settlePromises = function (promise) {
                this._normalQueue._pushOne(promise);
                this._queueTick();
            };

            Async.prototype._drainQueue = function (queue) {
                while (queue.length() > 0) {
                    var fn = queue.shift();
                    if (typeof fn !== "function") {
                        fn._settlePromises();
                        continue;
                    }
                    var receiver = queue.shift();
                    var arg = queue.shift();
                    fn.call(receiver, arg);
                }
            };

            Async.prototype._drainQueues = function () {
                this._drainQueue(this._normalQueue);
                this._reset();
                this._haveDrainedQueues = true;
                this._drainQueue(this._lateQueue);
            };

            Async.prototype._queueTick = function () {
                if (!this._isTickUsed) {
                    this._isTickUsed = true;
                    this._schedule(this.drainQueues);
                }
            };

            Async.prototype._reset = function () {
                this._isTickUsed = false;
            };

            module.exports = Async;
            module.exports.firstLineError = firstLineError;

        }, {"./queue": 26, "./schedule": 29}],
        3: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL, tryConvertToPromise, debug) {
                var calledBind = false;
                var rejectThis = function (_, e) {
                    this._reject(e);
                };

                var targetRejected = function (e, context) {
                    context.promiseRejectionQueued = true;
                    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
                };

                var bindingResolved = function (thisArg, context) {
                    this._setBoundTo(thisArg);
                    if (((this._bitField & 50397184) === 0)) {
                        this._resolveCallback(context.target);
                    }
                };

                var bindingRejected = function (e, context) {
                    if (!context.promiseRejectionQueued) this._reject(e);
                };

                Promise.prototype.bind = function (thisArg) {
                    if (!calledBind) {
                        calledBind = true;
                        Promise.prototype._propagateFrom = debug.propagateFromFunction();
                    }
                    var maybePromise = tryConvertToPromise(thisArg);
                    var ret = new Promise(INTERNAL);
                    ret._propagateFrom(this, 1);
                    var target = this._target();
                    if (maybePromise instanceof Promise) {
                        var context = {
                            promiseRejectionQueued: false,
                            promise: ret,
                            target: target,
                            bindingPromise: maybePromise
                        };
                        target._then(INTERNAL, targetRejected, undefined, ret, context);
                        maybePromise._then(
                            bindingResolved, bindingRejected, undefined, ret, context);
                        ret._setOnCancel(maybePromise);
                    } else {
                        ret._setBoundTo(thisArg);
                        ret._resolveCallback(target);
                    }
                    return ret;
                };

                Promise.prototype._setBoundTo = function (obj) {
                    if (obj !== undefined) {
                        this._bitField = this._bitField | 2097152;
                        this._boundTo = obj;
                    } else {
                        this._bitField = this._bitField & (~2097152);
                    }
                };

                Promise.prototype._isBound = function () {
                    return (this._bitField & 2097152) === 2097152;
                };

                Promise.bind = function (thisArg, value) {
                    return Promise.resolve(value).bind(thisArg);
                };
            };

        }, {}],
        4: [function (_dereq_, module, exports) {
            "use strict";
            var old;
            if (typeof Promise !== "undefined") old = Promise;
            function noConflict() {
                try { if (Promise === bluebird) Promise = old; }
                catch (e) {}
                return bluebird;
            }

            var bluebird = _dereq_("./promise")();
            bluebird.noConflict = noConflict;
            module.exports = bluebird;

        }, {"./promise": 22}],
        5: [function (_dereq_, module, exports) {
            "use strict";
            var cr = Object.create;
            if (cr) {
                var callerCache = cr(null);
                var getterCache = cr(null);
                callerCache[" size"] = getterCache[" size"] = 0;
            }

            module.exports = function (Promise) {
                var util = _dereq_("./util");
                var canEvaluate = util.canEvaluate;
                var isIdentifier = util.isIdentifier;

                var getMethodCaller;
                var getGetter;
                if (!true) {
                    var makeMethodCaller = function (methodName) {
                        return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
                    };

                    var makeGetter = function (propertyName) {
                        return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
                    };

                    var getCompiled = function (name, compiler, cache) {
                        var ret = cache[name];
                        if (typeof ret !== "function") {
                            if (!isIdentifier(name)) {
                                return null;
                            }
                            ret = compiler(name);
                            cache[name] = ret;
                            cache[" size"]++;
                            if (cache[" size"] > 512) {
                                var keys = Object.keys(cache);
                                for (var i = 0; i < 256; ++i) delete cache[keys[i]];
                                cache[" size"] = keys.length - 256;
                            }
                        }
                        return ret;
                    };

                    getMethodCaller = function (name) {
                        return getCompiled(name, makeMethodCaller, callerCache);
                    };

                    getGetter = function (name) {
                        return getCompiled(name, makeGetter, getterCache);
                    };
                }

                function ensureMethod(obj, methodName) {
                    var fn;
                    if (obj != null) fn = obj[methodName];
                    if (typeof fn !== "function") {
                        var message = "Object " + util.classString(obj) + " has no method '" +
                            util.toString(methodName) + "'";
                        throw new Promise.TypeError(message);
                    }
                    return fn;
                }

                function caller(obj) {
                    var methodName = this.pop();
                    var fn = ensureMethod(obj, methodName);
                    return fn.apply(obj, this);
                }

                Promise.prototype.call = function (methodName) {
                    var args = [].slice.call(arguments, 1);
                    ;
                    if (!true) {
                        if (canEvaluate) {
                            var maybeCaller = getMethodCaller(methodName);
                            if (maybeCaller !== null) {
                                return this._then(
                                    maybeCaller, undefined, undefined, args, undefined);
                            }
                        }
                    }
                    args.push(methodName);
                    return this._then(caller, undefined, undefined, args, undefined);
                };

                function namedGetter(obj) {
                    return obj[this];
                }

                function indexedGetter(obj) {
                    var index = +this;
                    if (index < 0) index = Math.max(0, index + obj.length);
                    return obj[index];
                }

                Promise.prototype.get = function (propertyName) {
                    var isIndex = (typeof propertyName === "number");
                    var getter;
                    if (!isIndex) {
                        if (canEvaluate) {
                            var maybeGetter = getGetter(propertyName);
                            getter = maybeGetter !== null ? maybeGetter : namedGetter;
                        } else {
                            getter = namedGetter;
                        }
                    } else {
                        getter = indexedGetter;
                    }
                    return this._then(getter, undefined, undefined, propertyName, undefined);
                };
            };

        }, {"./util": 36}],
        6: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, PromiseArray, apiRejection, debug) {
                var util = _dereq_("./util");
                var tryCatch = util.tryCatch;
                var errorObj = util.errorObj;
                var async = Promise._async;

                Promise.prototype.cancelAfter = function (ms) {
                    var self = this;
                    setTimeout(function () {
                        self.cancel();
                    }, ms);
                };

                Promise.prototype["break"] = Promise.prototype.cancel = function () {
                    if (!debug.cancellation()) return this._warn("cancellation is disabled");

                    var promise = this;
                    while (promise.isCancellable()) {
                        promise._invokeOnCancel(promise._onCancel());
                        var parent = promise._cancellationParent;
                        if (parent == null || !parent.isCancellable()) {
                            if (promise._isFollowing()) {
                                promise._followee().cancel();
                            } else {
                                promise._cancel();
                            }
                            break;
                        } else {
                            if (promise._isFollowing()) promise._followee().cancel();
                            promise = parent;
                        }
                    }
                };

                Promise.prototype._cancel = function () {
                    if (!this.isCancellable()) return;
                    this._setCancelled();
                    if (this._length() > 0) {
                        async.invoke(this._cancelPromises, this, undefined);
                    }
                };

                Promise.prototype._cancelPromises = function () {
                    if (this._length() > 0) this._settlePromises();
                };

                Promise.prototype._unsetOnCancel = function () {
                    this._onCancelField = undefined;
                };

                Promise.prototype.isCancellable = function () {
                    return this.isPending() && !this.isCancelled();
                };

                Promise.prototype.onCancel = function (onCancel) {
                    if (!debug.cancellation()) return this._warn("cancellation is disabled");
                    if (typeof onCancel !== "function") {
                        return apiRejection("onCancel must be a function, got: "
                        + util.toString(onCancel));
                    }
                    this._attachCancellationCallback(onCancel);
                    return this;
                };

                Promise.prototype._doInvokeOnCancel = function (onCancelCallback) {
                    if (onCancelCallback !== undefined) {
                        if (typeof onCancelCallback === "function") {
                            var e = tryCatch(onCancelCallback).call(this._boundTo);
                            if (e === errorObj) {
                                this._attachExtraTrace(e.e);
                                async.throwLater(e.e);
                            }
                        } else if (onCancelCallback instanceof Promise) {
                            onCancelCallback.cancel();
                        } else {
                            onCancelCallback._resultCancelled(this);
                        }
                    }
                };

                Promise.prototype._invokeOnCancel = function (onCancelCallback) {
                    this._unsetOnCancel();
                    async.invoke(this._doInvokeOnCancel, this, onCancelCallback);
                };

            };

        }, {"./util": 36}],
        7: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (NEXT_FILTER) {
                var util = _dereq_("./util");
                var getKeys = _dereq_("./es5").keys;
                var tryCatch = util.tryCatch;
                var errorObj = util.errorObj;

                function catchFilter(instances, cb, promise) {
                    return function (e) {
                        var boundTo = promise._boundTo;
                        predicateLoop: for (var i = 0; i < instances.length; ++i) {
                            var item = instances[i];

                            if (item === Error ||
                                (item != null && item.prototype instanceof Error)) {
                                if (e instanceof item) {
                                    return tryCatch(cb).call(boundTo, e);
                                }
                            } else if (typeof item === "function") {
                                var matchesPredicate = tryCatch(item).call(boundTo, e);
                                if (matchesPredicate === errorObj) {
                                    return matchesPredicate;
                                } else if (matchesPredicate) {
                                    return tryCatch(cb).call(boundTo, e);
                                }
                            } else if (util.isObject(e)) {
                                var keys = getKeys(item);
                                for (var j = 0; j < keys.length; ++j) {
                                    var key = keys[j];
                                    if (item[key] != e[key]) {
                                        continue predicateLoop;
                                    }
                                }
                                return tryCatch(cb).call(boundTo, e);
                            }
                        }
                        return NEXT_FILTER;
                    };
                }

                return catchFilter;
            };

        }, {"./es5": 13, "./util": 36}],
        8: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise) {
                var longStackTraces = false;
                var contextStack = [];

                Promise.prototype._promiseCreated = function () {};
                Promise.prototype._pushContext = function () {};
                Promise.prototype._popContext = function () {return 0;};
                Promise._peekContext = Promise.prototype._peekContext = function () {};

                function Context() {
                    this._trace = new Context.CapturedTrace(peekContext());
                }

                Context.prototype._pushContext = function () {
                    if (this._trace !== undefined) {
                        this._trace._promisesCreated = 0;
                        contextStack.push(this._trace);
                    }
                };

                Context.prototype._popContext = function () {
                    if (this._trace !== undefined) {
                        var trace = contextStack.pop();
                        var ret = trace._promisesCreated;
                        trace._promisesCreated = 0;
                        return ret;
                    }
                    return 0;
                };

                function createContext() {
                    if (longStackTraces) return new Context();
                }

                function peekContext() {
                    var lastIndex = contextStack.length - 1;
                    if (lastIndex >= 0) {
                        return contextStack[lastIndex];
                    }
                    return undefined;
                }

                Context.CapturedTrace = null;
                Context.create = createContext;
                Context.activateLongStackTraces = function () {
                    longStackTraces = true;
                    Promise.prototype._pushContext = Context.prototype._pushContext;
                    Promise.prototype._popContext = Context.prototype._popContext;
                    Promise._peekContext = Promise.prototype._peekContext = peekContext;
                    Promise.prototype._promiseCreated = function () {
                        var ctx = this._peekContext();
                        if (ctx) ctx._promisesCreated++;
                    };
                };
                return Context;
            };

        }, {}],
        9: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, Context) {
                var async = Promise._async;
                var Warning = _dereq_("./errors").Warning;
                var util = _dereq_("./util");
                var canAttachTrace = util.canAttachTrace;
                var unhandledRejectionHandled;
                var possiblyUnhandledRejection;
                var bluebirdFramePattern =
                    /[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/;
                var stackFramePattern = null;
                var formatStack = null;
                var indentStackFrames = false;
                var printWarning;
                var debugging = !!(true || util.env("BLUEBIRD_DEBUG") ||
                util.env("NODE_ENV") === "development");
                var warnings = !!(util.env("BLUEBIRD_WARNINGS") != 0 &&
                (debugging || util.env("BLUEBIRD_WARNINGS")));
                var longStackTraces = !!(util.env("BLUEBIRD_LONG_STACK_TRACES") != 0 &&
                (debugging || util.env("BLUEBIRD_LONG_STACK_TRACES")));

                Promise.prototype._ensurePossibleRejectionHandled = function () {
                    this._setRejectionIsUnhandled();
                    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
                };

                Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
                    fireRejectionEvent("rejectionHandled",
                        unhandledRejectionHandled, undefined, this);
                };

                Promise.prototype._notifyUnhandledRejection = function () {
                    if (this._isRejectionUnhandled()) {
                        var reason = this._settledValue();
                        this._setUnhandledRejectionIsNotified();
                        fireRejectionEvent("unhandledRejection",
                            possiblyUnhandledRejection, reason, this);
                    }
                };

                Promise.prototype._setUnhandledRejectionIsNotified = function () {
                    this._bitField = this._bitField | 262144;
                };

                Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
                    this._bitField = this._bitField & (~262144);
                };

                Promise.prototype._isUnhandledRejectionNotified = function () {
                    return (this._bitField & 262144) > 0;
                };

                Promise.prototype._setRejectionIsUnhandled = function () {
                    this._bitField = this._bitField | 1048576;
                };

                Promise.prototype._unsetRejectionIsUnhandled = function () {
                    this._bitField = this._bitField & (~1048576);
                    if (this._isUnhandledRejectionNotified()) {
                        this._unsetUnhandledRejectionIsNotified();
                        this._notifyUnhandledRejectionIsHandled();
                    }
                };

                Promise.prototype._isRejectionUnhandled = function () {
                    return (this._bitField & 1048576) > 0;
                };

                Promise.prototype._warn = function (message, shouldUseOwnTrace) {
                    return warn(message, shouldUseOwnTrace, this);
                };

                Promise.onPossiblyUnhandledRejection = function (fn) {
                    possiblyUnhandledRejection = typeof fn === "function" ? fn : undefined;
                };

                Promise.onUnhandledRejectionHandled = function (fn) {
                    unhandledRejectionHandled = typeof fn === "function" ? fn : undefined;
                };

                Promise.longStackTraces = function () {
                    if (async.haveItemsQueued() && !config.longStackTraces) {
                        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/DT1qyG\u000a");
                    }
                    if (!config.longStackTraces && longStackTracesIsSupported()) {
                        config.longStackTraces = true;
                        Promise.prototype._captureStackTrace = longStackTracesCaptureStackTrace;
                        Promise.prototype._attachExtraTrace = longStackTracesAttachExtraTrace;
                        Context.activateLongStackTraces();
                    }
                };

                Promise.hasLongStackTraces = function () {
                    return config.longStackTraces && longStackTracesIsSupported();
                };

                Promise.config = function (opts) {
                    opts = Object(opts);
                    if ("longStackTraces" in opts && opts.longStackTraces) {
                        Promise.longStackTraces();
                    }
                    if ("warnings" in opts) {
                        config.warnings = !!opts.warnings;
                    }
                    if ("cancellation" in opts && opts.cancellation && !config.cancellation) {
                        if (async.haveItemsQueued()) {
                            throw new Error(
                                "cannot enable cancellation after promises are in use");
                        }
                        Promise.prototype._clearCancellationData =
                            cancellationClearCancellationData;
                        Promise.prototype._propagateFrom = cancellationPropagateFrom;
                        Promise.prototype._onCancel = cancellationOnCancel;
                        Promise.prototype._setOnCancel = cancellationSetOnCancel;
                        Promise.prototype._attachCancellationCallback =
                            cancellationAttachCancellationCallback;
                        propagateFromFunction = cancellationPropagateFrom;
                        config.cancellation = true;
                    }
                };

                Promise.prototype._onCancel = function () {};
                Promise.prototype._setOnCancel = function (handler) { ; };
                Promise.prototype._attachCancellationCallback = function (onCancel, ctx) {
                    ;
                    ;
                };
                Promise.prototype._captureStackTrace = function () {};
                Promise.prototype._attachExtraTrace = function () {};
                Promise.prototype._clearCancellationData = function () {};
                Promise.prototype._propagateFrom = function (parent, flags) {
                    ;
                    ;
                };

                function cancellationAttachCancellationCallback(onCancel, ctx) {
                    if (!this.isCancellable()) {
                        if (this.isCancelled()) {
                            async.invoke(this._invokeOnCancel, this, onCancel);
                        }
                        return this;
                    }
                    var target = this._target();
                    if (target._onCancel() !== undefined) {
                        var newOnCancel = onCancel;
                        var oldOnCancel = target._onCancel();
                        if (ctx === undefined) ctx = this;
                        onCancel = function () {
                            ctx._invokeOnCancel(oldOnCancel);
                            ctx._invokeOnCancel(newOnCancel);
                            target._unsetOnCancel();
                        };
                    }
                    target._setOnCancel(onCancel);
                }

                function cancellationOnCancel() {
                    return this._onCancelField;
                }

                function cancellationSetOnCancel(onCancel) {
                    this._onCancelField = onCancel;
                }

                function cancellationClearCancellationData() {
                    this._cancellationParent = undefined;
                    this._onCancelField = undefined;
                }

                function cancellationPropagateFrom(parent, flags) {
                    if ((flags & 1) !== 0) {
                        this._cancellationParent = parent;
                    }
                    if ((flags & 2) !== 0 && parent._isBound()) {
                        this._setBoundTo(parent._boundTo);
                    }
                }

                function bindingPropagateFrom(parent, flags) {
                    if ((flags & 2) !== 0 && parent._isBound()) {
                        this._setBoundTo(parent._boundTo);
                    }
                }

                var propagateFromFunction = bindingPropagateFrom;

                function longStackTracesCaptureStackTrace() {
                    this._trace = new CapturedTrace(this._peekContext());
                }

                function longStackTracesAttachExtraTrace(error, ignoreSelf) {
                    if (canAttachTrace(error)) {
                        var trace = this._trace;
                        if (trace !== undefined) {
                            if (ignoreSelf) trace = trace._parent;
                        }
                        if (trace !== undefined) {
                            trace.attachExtraTrace(error);
                        } else if (!error.__stackCleaned__) {
                            var parsed = parseStackAndMessage(error);
                            error.stack = parsed.message + "\n" + parsed.stack.join("\n");
                            util.notEnumerableProp(error, "__stackCleaned__", true);
                        }
                    }
                }

                function checkForgottenReturns(returnValue, promisesCreated, name, promise) {
                    if (returnValue === undefined &&
                        promisesCreated > 0 &&
                        config.longStackTraces &&
                        config.warnings) {
                        var msg = "a promise was created in a " + name +
                            " handler but was not returned from it";
                        promise._warn(msg);
                    }
                }

                function deprecated(name, replacement) {
                    var message = name +
                        " is deprecated and will be removed in a future version.";
                    if (replacement) message += " Use " + replacement + " instead.";
                    return warn(message);
                }

                function warn(message, shouldUseOwnTrace, promise) {
                    if (!config.warnings) return;
                    var warning = new Warning(message);
                    var ctx;
                    if (shouldUseOwnTrace) {
                        promise._attachExtraTrace(warning);
                    } else if (config.longStackTraces && (ctx = Promise._peekContext())) {
                        ctx.attachExtraTrace(warning);
                    } else {
                        var parsed = parseStackAndMessage(warning);
                        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
                    }
                    formatAndLogError(warning, "", true);
                }

                function reconstructStack(message, stacks) {
                    for (var i = 0; i < stacks.length - 1; ++i) {
                        stacks[i].push("From previous event:");
                        stacks[i] = stacks[i].join("\n");
                    }
                    if (i < stacks.length) {
                        stacks[i] = stacks[i].join("\n");
                    }
                    return message + "\n" + stacks.join("\n");
                }

                function removeDuplicateOrEmptyJumps(stacks) {
                    for (var i = 0; i < stacks.length; ++i) {
                        if (stacks[i].length === 0 ||
                            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i + 1][0])) {
                            stacks.splice(i, 1);
                            i--;
                        }
                    }
                }

                function removeCommonRoots(stacks) {
                    var current = stacks[0];
                    for (var i = 1; i < stacks.length; ++i) {
                        var prev = stacks[i];
                        var currentLastIndex = current.length - 1;
                        var currentLastLine = current[currentLastIndex];
                        var commonRootMeetPoint = -1;

                        for (var j = prev.length - 1; j >= 0; --j) {
                            if (prev[j] === currentLastLine) {
                                commonRootMeetPoint = j;
                                break;
                            }
                        }

                        for (var j = commonRootMeetPoint; j >= 0; --j) {
                            var line = prev[j];
                            if (current[currentLastIndex] === line) {
                                current.pop();
                                currentLastIndex--;
                            } else {
                                break;
                            }
                        }
                        current = prev;
                    }
                }

                function cleanStack(stack) {
                    var ret = [];
                    for (var i = 0; i < stack.length; ++i) {
                        var line = stack[i];
                        var isTraceLine = stackFramePattern.test(line) ||
                            "    (No stack trace)" === line;
                        var isInternalFrame = isTraceLine && shouldIgnore(line);
                        if (isTraceLine && !isInternalFrame) {
                            if (indentStackFrames && line.charAt(0) !== " ") {
                                line = "    " + line;
                            }
                            ret.push(line);
                        }
                    }
                    return ret;
                }

                function stackFramesAsArray(error) {
                    var stack = error.stack.replace(/\s+$/g, "").split("\n");
                    for (var i = 0; i < stack.length; ++i) {
                        var line = stack[i];
                        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
                            break;
                        }
                    }
                    if (i > 0) {
                        stack = stack.slice(i);
                    }
                    return stack;
                }

                function parseStackAndMessage(error) {
                    var stack = error.stack;
                    var message = error.toString();
                    stack = typeof stack === "string" && stack.length > 0
                        ? stackFramesAsArray(error) : ["    (No stack trace)"];
                    return {
                        message: message,
                        stack: cleanStack(stack)
                    };
                }

                function formatAndLogError(error, title, isSoft) {
                    if (typeof console !== "undefined") {
                        var message;
                        if (util.isObject(error)) {
                            var stack = error.stack;
                            message = title + formatStack(stack, error);
                        } else {
                            message = title + String(error);
                        }
                        if (typeof printWarning === "function") {
                            printWarning(message, isSoft);
                        } else if (typeof console.log === "function" ||
                            typeof console.log === "object") {
                            console.log(message);
                        }
                    }
                }

                function fireRejectionEvent(name, localHandler, reason, promise) {
                    var localEventFired = false;
                    try {
                        if (typeof localHandler === "function") {
                            localEventFired = true;
                            if (name === "rejectionHandled") {
                                localHandler(promise);
                            } else {
                                localHandler(reason, promise);
                            }
                        }
                    } catch (e) {
                        async.throwLater(e);
                    }

                    var globalEventFired = false;
                    try {
                        globalEventFired = fireGlobalEvent(name, reason, promise);
                    } catch (e) {
                        globalEventFired = true;
                        async.throwLater(e);
                    }

                    var domEventFired = false;
                    if (fireDomEvent) {
                        try {
                            domEventFired = fireDomEvent(name.toLowerCase(), {
                                reason: reason,
                                promise: promise
                            });
                        } catch (e) {
                            domEventFired = true;
                            async.throwLater(e);
                        }
                    }

                    if (!globalEventFired && !localEventFired && !domEventFired &&
                        name === "unhandledRejection") {
                        formatAndLogError(reason, "Unhandled rejection ");
                    }
                }

                function formatNonError(obj) {
                    var str;
                    if (typeof obj === "function") {
                        str = "[function " +
                        (obj.name || "anonymous") +
                        "]";
                    } else {
                        str = obj && typeof obj.toString === "function"
                            ? obj.toString() : util.toString(obj);
                        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
                        if (ruselessToString.test(str)) {
                            try {
                                var newStr = JSON.stringify(obj);
                                str = newStr;
                            }
                            catch (e) {

                            }
                        }
                        if (str.length === 0) {
                            str = "(empty array)";
                        }
                    }
                    return ("(<" + snip(str) + ">, no stack trace)");
                }

                function snip(str) {
                    var maxChars = 41;
                    if (str.length < maxChars) {
                        return str;
                    }
                    return str.substr(0, maxChars - 3) + "...";
                }

                function longStackTracesIsSupported() {
                    return typeof captureStackTrace === "function";
                }

                var shouldIgnore = function () { return false; };
                var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;

                function parseLineInfo(line) {
                    var matches = line.match(parseLineInfoRegex);
                    if (matches) {
                        return {
                            fileName: matches[1],
                            line: parseInt(matches[2], 10)
                        };
                    }
                }

                function setBounds(firstLineError, lastLineError) {
                    if (!longStackTracesIsSupported()) return;
                    var firstStackLines = firstLineError.stack.split("\n");
                    var lastStackLines = lastLineError.stack.split("\n");
                    var firstIndex = -1;
                    var lastIndex = -1;
                    var firstFileName;
                    var lastFileName;
                    for (var i = 0; i < firstStackLines.length; ++i) {
                        var result = parseLineInfo(firstStackLines[i]);
                        if (result) {
                            firstFileName = result.fileName;
                            firstIndex = result.line;
                            break;
                        }
                    }
                    for (var i = 0; i < lastStackLines.length; ++i) {
                        var result = parseLineInfo(lastStackLines[i]);
                        if (result) {
                            lastFileName = result.fileName;
                            lastIndex = result.line;
                            break;
                        }
                    }
                    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
                        firstFileName !== lastFileName || firstIndex >= lastIndex) {
                        return;
                    }

                    shouldIgnore = function (line) {
                        if (bluebirdFramePattern.test(line)) return true;
                        var info = parseLineInfo(line);
                        if (info) {
                            if (info.fileName === firstFileName &&
                                (firstIndex <= info.line && info.line <= lastIndex)) {
                                return true;
                            }
                        }
                        return false;
                    };
                }

                function CapturedTrace(parent) {
                    this._parent = parent;
                    this._promisesCreated = 0;
                    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
                    captureStackTrace(this, CapturedTrace);
                    if (length > 32) this.uncycle();
                }

                util.inherits(CapturedTrace, Error);
                Context.CapturedTrace = CapturedTrace;

                CapturedTrace.prototype.uncycle = function () {
                    var length = this._length;
                    if (length < 2) return;
                    var nodes = [];
                    var stackToIndex = {};

                    for (var i = 0, node = this; node !== undefined; ++i) {
                        nodes.push(node);
                        node = node._parent;
                    }
                    length = this._length = i;
                    for (var i = length - 1; i >= 0; --i) {
                        var stack = nodes[i].stack;
                        if (stackToIndex[stack] === undefined) {
                            stackToIndex[stack] = i;
                        }
                    }
                    for (var i = 0; i < length; ++i) {
                        var currentStack = nodes[i].stack;
                        var index = stackToIndex[currentStack];
                        if (index !== undefined && index !== i) {
                            if (index > 0) {
                                nodes[index - 1]._parent = undefined;
                                nodes[index - 1]._length = 1;
                            }
                            nodes[i]._parent = undefined;
                            nodes[i]._length = 1;
                            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

                            if (index < length - 1) {
                                cycleEdgeNode._parent = nodes[index + 1];
                                cycleEdgeNode._parent.uncycle();
                                cycleEdgeNode._length =
                                    cycleEdgeNode._parent._length + 1;
                            } else {
                                cycleEdgeNode._parent = undefined;
                                cycleEdgeNode._length = 1;
                            }
                            var currentChildLength = cycleEdgeNode._length + 1;
                            for (var j = i - 2; j >= 0; --j) {
                                nodes[j]._length = currentChildLength;
                                currentChildLength++;
                            }
                            return;
                        }
                    }
                };

                CapturedTrace.prototype.attachExtraTrace = function (error) {
                    if (error.__stackCleaned__) return;
                    this.uncycle();
                    var parsed = parseStackAndMessage(error);
                    var message = parsed.message;
                    var stacks = [parsed.stack];

                    var trace = this;
                    while (trace !== undefined) {
                        stacks.push(cleanStack(trace.stack.split("\n")));
                        trace = trace._parent;
                    }
                    removeCommonRoots(stacks);
                    removeDuplicateOrEmptyJumps(stacks);
                    error.stack = reconstructStack(message, stacks);
                    util.notEnumerableProp(error, "__stackCleaned__", true);
                };

                var captureStackTrace = (function stackDetection() {
                    var v8stackFramePattern = /^\s*at\s*/;
                    var v8stackFormatter = function (stack, error) {
                        if (typeof stack === "string") return stack;

                        if (error.name !== undefined &&
                            error.message !== undefined) {
                            return error.toString();
                        }
                        return formatNonError(error);
                    };

                    if (typeof Error.stackTraceLimit === "number" &&
                        typeof Error.captureStackTrace === "function") {
                        Error.stackTraceLimit += 6;
                        stackFramePattern = v8stackFramePattern;
                        formatStack = v8stackFormatter;
                        var captureStackTrace = Error.captureStackTrace;

                        shouldIgnore = function (line) {
                            return bluebirdFramePattern.test(line);
                        };
                        return function (receiver, ignoreUntil) {
                            Error.stackTraceLimit += 6;
                            captureStackTrace(receiver, ignoreUntil);
                            Error.stackTraceLimit -= 6;
                        };
                    }
                    var err = new Error();

                    if (typeof err.stack === "string" &&
                        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
                        stackFramePattern = /@/;
                        formatStack = v8stackFormatter;
                        indentStackFrames = true;
                        return function captureStackTrace(o) {
                            o.stack = new Error().stack;
                        };
                    }

                    var hasStackAfterThrow;
                    try { throw new Error(); }
                    catch (e) {
                        hasStackAfterThrow = ("stack" in e);
                    }
                    if (!("stack" in err) && hasStackAfterThrow) {
                        stackFramePattern = v8stackFramePattern;
                        formatStack = v8stackFormatter;
                        return function captureStackTrace(o) {
                            Error.stackTraceLimit += 6;
                            try { throw new Error(); }
                            catch (e) { o.stack = e.stack; }
                            Error.stackTraceLimit -= 6;
                        };
                    }

                    formatStack = function (stack, error) {
                        if (typeof stack === "string") return stack;

                        if ((typeof error === "object" ||
                            typeof error === "function") &&
                            error.name !== undefined &&
                            error.message !== undefined) {
                            return error.toString();
                        }
                        return formatNonError(error);
                    };

                    return null;

                })([]);

                var fireDomEvent;
                var fireGlobalEvent = (function () {
                    if (util.isNode) {
                        return function (name, reason, promise) {
                            if (name === "rejectionHandled") {
                                return process.emit(name, promise);
                            } else {
                                return process.emit(name, reason, promise);
                            }
                        };
                    } else {
                        var customEventWorks = false;
                        var anyEventWorks = true;
                        try {
                            var ev = new self.CustomEvent("test");
                            customEventWorks = ev instanceof CustomEvent;
                        } catch (e) {}
                        if (!customEventWorks) {
                            try {
                                var event = document.createEvent("CustomEvent");
                                event.initCustomEvent("testingtheevent", false, true, {});
                                self.dispatchEvent(event);
                            } catch (e) {
                                anyEventWorks = false;
                            }
                        }
                        if (anyEventWorks) {
                            fireDomEvent = function (type, detail) {
                                var event;
                                if (customEventWorks) {
                                    event = new self.CustomEvent(type, {
                                        detail: detail,
                                        bubbles: false,
                                        cancelable: true
                                    });
                                } else if (self.dispatchEvent) {
                                    event = document.createEvent("CustomEvent");
                                    event.initCustomEvent(type, false, true, detail);
                                }

                                return event ? !self.dispatchEvent(event) : false;
                            };
                        }

                        var toWindowMethodNameMap = {};
                        toWindowMethodNameMap["unhandledRejection"] = ("on" +
                        "unhandledRejection").toLowerCase();
                        toWindowMethodNameMap["rejectionHandled"] = ("on" +
                        "rejectionHandled").toLowerCase();

                        return function (name, reason, promise) {
                            var methodName = toWindowMethodNameMap[name];
                            var method = self[methodName];
                            if (!method) return false;
                            if (name === "rejectionHandled") {
                                method.call(self, promise);
                            } else {
                                method.call(self, reason, promise);
                            }
                            return true;
                        };
                    }
                })();

                if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
                    printWarning = function (message) {
                        console.warn(message);
                    };
                    if (util.isNode && process.stderr.isTTY) {
                        printWarning = function (message, isSoft) {
                            var color = isSoft ? "\u001b[33m" : "\u001b[31m";
                            process.stderr.write(color + message + "\u001b[0m\n");
                        };
                    } else if (!util.isNode && typeof (new Error().stack) === "string") {
                        printWarning = function (message, isSoft) {
                            console.warn("%c" + message,
                                isSoft ? "color: darkorange" : "color: red");
                        };
                    }
                }

                var config = {
                    warnings: warnings,
                    longStackTraces: false,
                    cancellation: false
                };

                if (longStackTraces) Promise.longStackTraces();

                return {
                    longStackTraces: function () {
                        return config.longStackTraces;
                    },
                    warnings: function () {
                        return config.warnings;
                    },
                    cancellation: function () {
                        return config.cancellation;
                    },
                    propagateFromFunction: function () {
                        return propagateFromFunction;
                    },
                    checkForgottenReturns: checkForgottenReturns,
                    setBounds: setBounds,
                    warn: warn,
                    deprecated: deprecated,
                    CapturedTrace: CapturedTrace
                };
            };

        }, {"./errors": 12, "./util": 36}],
        10: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise) {
                var es5 = _dereq_("./es5").isES5;

                function returner() {
                    return es5 ? this : this.value;
                }

                function thrower() {
                    throw es5 ? this : this.reason;
                }

                Promise.prototype["return"] =
                    Promise.prototype.thenReturn = function (value) {
                        if (!es5) value = {value: value};
                        return this._then(
                            returner, undefined, undefined, value, undefined);
                    };

                Promise.prototype["throw"] =
                    Promise.prototype.thenThrow = function (reason) {
                        if (!es5) reason = {reason: reason};
                        return this._then(thrower, undefined, undefined, reason, undefined);
                    };

                Promise.prototype.catchThrow = function (reason) {
                    if (arguments.length === 1) {
                        if (!es5) reason = {reason: reason};
                        return this._then(undefined, thrower, undefined, reason, undefined);
                    } else {
                        var _reason = arguments[1];
                        var handler = function () {throw _reason;};
                        return this.caught(reason, handler);
                    }
                };

                Promise.prototype.catchReturn = function (value) {
                    if (arguments.length === 1) {
                        if (!es5) value = {value: value};
                        return this._then(undefined, returner, undefined, value, undefined);
                    } else {
                        var _value = arguments[1];
                        var handler = function () {return _value;};
                        return this.caught(value, handler);
                    }
                };
            };

        }, {"./es5": 13}],
        11: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL) {
                var PromiseReduce = Promise.reduce;

                Promise.prototype.mapSeries = Promise.prototype.each = function (fn) {
                    return PromiseReduce(this, fn, INTERNAL, INTERNAL);
                };

                Promise.mapSeries = Promise.each = function (promises, fn) {
                    return PromiseReduce(promises, fn, INTERNAL, INTERNAL);
                };
            };

        }, {}],
        12: [function (_dereq_, module, exports) {
            "use strict";
            var es5 = _dereq_("./es5");
            var Objectfreeze = es5.freeze;
            var util = _dereq_("./util");
            var inherits = util.inherits;
            var notEnumerableProp = util.notEnumerableProp;

            function subError(nameProperty, defaultMessage) {
                function SubError(message) {
                    if (!(this instanceof SubError)) return new SubError(message);
                    notEnumerableProp(this, "message",
                        typeof message === "string" ? message : defaultMessage);
                    notEnumerableProp(this, "name", nameProperty);
                    if (Error.captureStackTrace) {
                        Error.captureStackTrace(this, this.constructor);
                    } else {
                        Error.call(this);
                    }
                }

                inherits(SubError, Error);
                return SubError;
            }

            var _TypeError, _RangeError;
            var Warning = subError("Warning", "warning");
            var CancellationError = subError("CancellationError", "cancellation error");
            var TimeoutError = subError("TimeoutError", "timeout error");
            var AggregateError = subError("AggregateError", "aggregate error");
            try {
                _TypeError = TypeError;
                _RangeError = RangeError;
            } catch (e) {
                _TypeError = subError("TypeError", "type error");
                _RangeError = subError("RangeError", "range error");
            }

            var methods = ("join pop push shift unshift slice filter forEach some " +
            "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

            for (var i = 0; i < methods.length; ++i) {
                if (typeof Array.prototype[methods[i]] === "function") {
                    AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
                }
            }

            es5.defineProperty(AggregateError.prototype, "length", {
                value: 0,
                configurable: false,
                writable: true,
                enumerable: true
            });
            AggregateError.prototype["isOperational"] = true;
            var level = 0;
            AggregateError.prototype.toString = function () {
                var indent = Array(level * 4 + 1).join(" ");
                var ret = "\n" + indent + "AggregateError of:" + "\n";
                level++;
                indent = Array(level * 4 + 1).join(" ");
                for (var i = 0; i < this.length; ++i) {
                    var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
                    var lines = str.split("\n");
                    for (var j = 0; j < lines.length; ++j) {
                        lines[j] = indent + lines[j];
                    }
                    str = lines.join("\n");
                    ret += str + "\n";
                }
                level--;
                return ret;
            };

            function OperationalError(message) {
                if (!(this instanceof OperationalError))
                    return new OperationalError(message);
                notEnumerableProp(this, "name", "OperationalError");
                notEnumerableProp(this, "message", message);
                this.cause = message;
                this["isOperational"] = true;

                if (message instanceof Error) {
                    notEnumerableProp(this, "message", message.message);
                    notEnumerableProp(this, "stack", message.stack);
                } else if (Error.captureStackTrace) {
                    Error.captureStackTrace(this, this.constructor);
                }

            }

            inherits(OperationalError, Error);

            var errorTypes = Error["__BluebirdErrorTypes__"];
            if (!errorTypes) {
                errorTypes = Objectfreeze({
                    CancellationError: CancellationError,
                    TimeoutError: TimeoutError,
                    OperationalError: OperationalError,
                    RejectionError: OperationalError,
                    AggregateError: AggregateError
                });
                notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
            }

            module.exports = {
                Error: Error,
                TypeError: _TypeError,
                RangeError: _RangeError,
                CancellationError: errorTypes.CancellationError,
                OperationalError: errorTypes.OperationalError,
                TimeoutError: errorTypes.TimeoutError,
                AggregateError: errorTypes.AggregateError,
                Warning: Warning
            };

        }, {"./es5": 13, "./util": 36}],
        13: [function (_dereq_, module, exports) {
            var isES5 = (function () {
                "use strict";
                return this === undefined;
            })();

            if (isES5) {
                module.exports = {
                    freeze: Object.freeze,
                    defineProperty: Object.defineProperty,
                    getDescriptor: Object.getOwnPropertyDescriptor,
                    keys: Object.keys,
                    names: Object.getOwnPropertyNames,
                    getPrototypeOf: Object.getPrototypeOf,
                    isArray: Array.isArray,
                    isES5: isES5,
                    propertyIsWritable: function (obj, prop) {
                        var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
                        return !!(!descriptor || descriptor.writable || descriptor.set);
                    }
                };
            } else {
                var has = {}.hasOwnProperty;
                var str = {}.toString;
                var proto = {}.constructor.prototype;

                var ObjectKeys = function (o) {
                    var ret = [];
                    for (var key in o) {
                        if (has.call(o, key)) {
                            ret.push(key);
                        }
                    }
                    return ret;
                };

                var ObjectGetDescriptor = function (o, key) {
                    return {value: o[key]};
                };

                var ObjectDefineProperty = function (o, key, desc) {
                    o[key] = desc.value;
                    return o;
                };

                var ObjectFreeze = function (obj) {
                    return obj;
                };

                var ObjectGetPrototypeOf = function (obj) {
                    try {
                        return Object(obj).constructor.prototype;
                    }
                    catch (e) {
                        return proto;
                    }
                };

                var ArrayIsArray = function (obj) {
                    try {
                        return str.call(obj) === "[object Array]";
                    }
                    catch (e) {
                        return false;
                    }
                };

                module.exports = {
                    isArray: ArrayIsArray,
                    keys: ObjectKeys,
                    names: ObjectKeys,
                    defineProperty: ObjectDefineProperty,
                    getDescriptor: ObjectGetDescriptor,
                    freeze: ObjectFreeze,
                    getPrototypeOf: ObjectGetPrototypeOf,
                    isES5: isES5,
                    propertyIsWritable: function () {
                        return true;
                    }
                };
            }

        }, {}],
        14: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL) {
                var PromiseMap = Promise.map;

                Promise.prototype.filter = function (fn, options) {
                    return PromiseMap(this, fn, options, INTERNAL);
                };

                Promise.filter = function (promises, fn, options) {
                    return PromiseMap(promises, fn, options, INTERNAL);
                };
            };

        }, {}],
        15: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, tryConvertToPromise) {
                var util = _dereq_("./util");
                var errorObj = util.errorObj;

                function checkCancel(ctx, reason) {
                    if (ctx.cancelPromise != null) {
                        if (arguments.length > 1) {
                            ctx.cancelPromise._reject(reason);
                        } else {
                            ctx.cancelPromise._cancel();
                        }
                        ctx.cancelPromise = null;
                        return true;
                    }
                    return false;
                }

                function succeed() {
                    return finallyHandler.call(this, this.promise._target()._settledValue());
                }

                function fail(reason) {
                    if (checkCancel(this, reason)) return;
                    errorObj.e = reason;
                    return errorObj;
                }

                function finallyHandler(reasonOrValue) {
                    var promise = this.promise;
                    var handler = this.handler;

                    if (!this.called) {
                        this.called = true;
                        var ret = handler.call(promise._boundTo);
                        if (ret !== undefined) {
                            var maybePromise = tryConvertToPromise(ret, promise);
                            if (maybePromise instanceof Promise) {
                                if (this.cancelPromise != null) {
                                    if (maybePromise.isCancelled()) {
                                        checkCancel(this);
                                    } else if (maybePromise.isPending()) {
                                        var ctx = this;
                                        var oldOnCancel = maybePromise._onCancel();
                                        maybePromise._setOnCancel(function () {
                                            checkCancel(ctx);
                                            maybePromise._invokeOnCancel(oldOnCancel);
                                        });
                                    }
                                }
                                return maybePromise._then(
                                    succeed, fail, undefined, this, undefined);
                            }
                        }
                    }

                    if (promise.isRejected()) {
                        checkCancel(this);
                        errorObj.e = reasonOrValue;
                        return errorObj;
                    } else {
                        checkCancel(this);
                        return reasonOrValue;
                    }
                }

                Promise.prototype._passThrough = function (handler, success, fail) {
                    if (typeof handler !== "function") return this.then();
                    return this._then(success, fail, undefined, {
                        promise: this,
                        handler: handler,
                        called: false,
                        cancelPromise: null
                    }, undefined);
                };

                Promise.prototype.lastly =
                    Promise.prototype["finally"] = function (handler) {
                        return this._passThrough(handler, finallyHandler, finallyHandler);
                    };

                Promise.prototype.tap = function (handler) {
                    return this._passThrough(handler, finallyHandler);
                };

                return finallyHandler;
            };

        }, {"./util": 36}],
        16: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise,
                                       apiRejection,
                                       INTERNAL,
                                       tryConvertToPromise) {
                var errors = _dereq_("./errors");
                var TypeError = errors.TypeError;
                var util = _dereq_("./util");
                var errorObj = util.errorObj;
                var tryCatch = util.tryCatch;
                var yieldHandlers = [];

                function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
                    for (var i = 0; i < yieldHandlers.length; ++i) {
                        traceParent._pushContext();
                        var result = tryCatch(yieldHandlers[i])(value);
                        traceParent._popContext();
                        if (result === errorObj) {
                            traceParent._pushContext();
                            var ret = Promise.reject(errorObj.e);
                            traceParent._popContext();
                            return ret;
                        }
                        var maybePromise = tryConvertToPromise(result, traceParent);
                        if (maybePromise instanceof Promise) return maybePromise;
                    }
                    return null;
                }

                function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
                    var promise = this._promise = new Promise(INTERNAL);
                    promise._captureStackTrace();
                    this._stack = stack;
                    this._generatorFunction = generatorFunction;
                    this._receiver = receiver;
                    this._generator = undefined;
                    this._yieldHandlers = typeof yieldHandler === "function"
                        ? [yieldHandler].concat(yieldHandlers)
                        : yieldHandlers;
                }

                PromiseSpawn.prototype.promise = function () {
                    return this._promise;
                };

                PromiseSpawn.prototype._run = function () {
                    this._generator = this._generatorFunction.call(this._receiver);
                    this._receiver =
                        this._generatorFunction = undefined;
                    this._next(undefined);
                };

                PromiseSpawn.prototype._continue = function (result) {
                    if (result === errorObj) {
                        return this._promise._rejectCallback(result.e, false);
                    }

                    var value = result.value;
                    if (result.done === true) {
                        this._promise._resolveCallback(value);
                    } else {
                        var maybePromise = tryConvertToPromise(value, this._promise);
                        if (!(maybePromise instanceof Promise)) {
                            maybePromise =
                                promiseFromYieldHandler(maybePromise,
                                    this._yieldHandlers,
                                    this._promise);
                            if (maybePromise === null) {
                                this._throw(
                                    new TypeError(
                                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/4Y4pDk\u000a\u000a".replace("%s", value) +
                                        "From coroutine:\u000a" +
                                        this._stack.split("\n").slice(1, -7).join("\n")
                                    )
                                );
                                return;
                            }
                        }
                        maybePromise._then(
                            this._next,
                            this._throw,
                            undefined,
                            this,
                            null
                        );
                    }
                };

                PromiseSpawn.prototype._throw = function (reason) {
                    this._promise._attachExtraTrace(reason);
                    this._promise._pushContext();
                    var result = tryCatch(this._generator["throw"])
                        .call(this._generator, reason);
                    this._promise._popContext();
                    this._continue(result);
                };

                PromiseSpawn.prototype._next = function (value) {
                    this._promise._pushContext();
                    var result = tryCatch(this._generator.next).call(this._generator, value);
                    this._promise._popContext();
                    this._continue(result);
                };

                Promise.coroutine = function (generatorFunction, options) {
                    if (typeof generatorFunction !== "function") {
                        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
                    }
                    var yieldHandler = Object(options).yieldHandler;
                    var PromiseSpawn$ = PromiseSpawn;
                    var stack = new Error().stack;
                    return function () {
                        var generator = generatorFunction.apply(this, arguments);
                        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                            stack);
                        spawn._generator = generator;
                        spawn._next(undefined);
                        return spawn.promise();
                    };
                };

                Promise.coroutine.addYieldHandler = function (fn) {
                    if (typeof fn !== "function") {
                        throw new TypeError("expecting a function but got " + util.classString(fn));
                    }
                    yieldHandlers.push(fn);
                };

                Promise.spawn = function (generatorFunction) {
                    if (typeof generatorFunction !== "function") {
                        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
                    }
                    var spawn = new PromiseSpawn(generatorFunction, this);
                    var ret = spawn.promise();
                    spawn._run(Promise.spawn);
                    return ret;
                };
            };

        }, {"./errors": 12, "./util": 36}],
        17: [function (_dereq_, module, exports) {
            "use strict";
            module.exports =
                function (Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
                    var util = _dereq_("./util");
                    var canEvaluate = util.canEvaluate;
                    var tryCatch = util.tryCatch;
                    var errorObj = util.errorObj;
                    var reject;

                    if (!true) {
                        if (canEvaluate) {
                            var thenCallback = function (i) {
                                return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
                            };

                            var generateHolderClass = function (total) {
                                var props = new Array(total);
                                for (var i = 0; i < props.length; ++i) {
                                    props[i] = "this.p" + (i + 1);
                                }
                                var assignment = props.join(" = ") + " = null;";
                                var passedArguments = props.join(", ");
                                var name = "Holder$" + total;

                                var code = "return function(tryCatch, errorObj) {                    \n\
            function [TheName](fn) {                                         \n\
                [TheProperties]                                              \n\
                this.fn = fn;                                                \n\
                this.now = 0;                                                \n\
            }                                                                \n\
            [TheName].prototype.checkFulfillment = function(promise) {       \n\
                var now = ++this.now;                                        \n\
                if (now === [TheTotal]) {                                    \n\
                    promise._pushContext();                                  \n\
                    var callback = this.fn;                                  \n\
                    var ret = tryCatch(callback)([ThePassedArguments]);      \n\
                    promise._popContext();                                   \n\
                    if (ret === errorObj) {                                  \n\
                        promise._rejectCallback(ret.e, false);               \n\
                    } else {                                                 \n\
                        promise._resolveCallback(ret);                       \n\
                    }                                                        \n\
                }                                                            \n\
            };                                                               \n\
                                                                             \n\
            return [TheName];                                                \n\
        }(tryCatch, errorObj);                                               \n\
        ";

                                code = code.replace(/\[TheName\]/g, name)
                                    .replace(/\[TheTotal\]/g, total)
                                    .replace(/\[ThePassedArguments\]/g, passedArguments)
                                    .replace(/\[TheProperties\]/g, assignment);

                                return new Function("tryCatch", "errorObj", code)(tryCatch, errorObj);
                            };

                            var holderClasses = [];
                            var thenCallbacks = [];

                            for (var i = 0; i < 8; ++i) {
                                holderClasses.push(generateHolderClass(i + 1));
                                thenCallbacks.push(thenCallback(i + 1));
                            }

                            reject = function (reason) {
                                this._reject(reason);
                            };
                        }
                    }

                    Promise.join = function () {
                        var last = arguments.length - 1;
                        var fn;
                        if (last > 0 && typeof arguments[last] === "function") {
                            fn = arguments[last];
                            if (!true) {
                                if (last <= 8 && canEvaluate) {
                                    var ret = new Promise(INTERNAL);
                                    ret._captureStackTrace();
                                    var HolderClass = holderClasses[last - 1];
                                    var holder = new HolderClass(fn);
                                    var callbacks = thenCallbacks;
                                    for (var i = 0; i < last; ++i) {
                                        var maybePromise = tryConvertToPromise(arguments[i], ret);
                                        if (maybePromise instanceof Promise) {
                                            maybePromise = maybePromise._target();
                                            var bitField = maybePromise._bitField;
                                            ;
                                            if (((bitField & 50397184) === 0)) {
                                                maybePromise._then(callbacks[i], reject,
                                                    undefined, ret, holder);
                                            } else if (((bitField & 33554432) !== 0)) {
                                                callbacks[i].call(ret,
                                                    maybePromise._value(), holder);
                                            } else if (((bitField & 16777216) !== 0)) {
                                                ret._reject(maybePromise._reason());
                                            } else {
                                                ret._cancel();
                                            }
                                        } else {
                                            callbacks[i].call(ret, maybePromise, holder);
                                        }
                                    }
                                    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
                                    return ret;
                                }
                            }
                        }
                        var args = [].slice.call(arguments);
                        ;
                        if (fn) args.pop();
                        var ret = new PromiseArray(args).promise();
                        return fn !== undefined ? ret.spread(fn) : ret;
                    };

                };

        }, {"./util": 36}],
        18: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise,
                                       PromiseArray,
                                       apiRejection,
                                       tryConvertToPromise,
                                       INTERNAL,
                                       debug) {
                var util = _dereq_("./util");
                var tryCatch = util.tryCatch;
                var errorObj = util.errorObj;
                var EMPTY_ARRAY = [];

                function MappingPromiseArray(promises, fn, limit, _filter) {
                    this.constructor$(promises);
                    this._promise._captureStackTrace();
                    this._callback = fn;
                    this._preservedValues = _filter === INTERNAL
                        ? new Array(this.length())
                        : null;
                    this._limit = limit;
                    this._inFlight = 0;
                    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
                    this._init$(undefined, -2);
                }

                util.inherits(MappingPromiseArray, PromiseArray);

                MappingPromiseArray.prototype._init = function () {};

                MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
                    var values = this._values;
                    var length = this.length();
                    var preservedValues = this._preservedValues;
                    var limit = this._limit;

                    if (index < 0) {
                        index = (index * -1) - 1;
                        values[index] = value;
                        if (limit >= 1) {
                            this._inFlight--;
                            this._drainQueue();
                            if (this._isResolved()) return;
                        }
                    } else {
                        if (limit >= 1 && this._inFlight >= limit) {
                            values[index] = value;
                            this._queue.push(index);
                            return;
                        }
                        if (preservedValues !== null) preservedValues[index] = value;

                        var promise = this._promise;
                        var callback = this._callback;
                        var receiver = promise._boundTo;
                        promise._pushContext();
                        var ret = tryCatch(callback).call(receiver, value, index, length);
                        var promisesCreated = promise._popContext();
                        debug.checkForgottenReturns(
                            ret,
                            promisesCreated,
                            preservedValues !== null ? "Promise.filter" : "Promise.map",
                            promise
                        );
                        if (ret === errorObj) return this._reject(ret.e);

                        var maybePromise = tryConvertToPromise(ret, this._promise);
                        if (maybePromise instanceof Promise) {
                            maybePromise = maybePromise._target();
                            var bitField = maybePromise._bitField;
                            ;
                            if (((bitField & 50397184) === 0)) {
                                if (limit >= 1) this._inFlight++;
                                values[index] = maybePromise;
                                return maybePromise._proxyPromiseArray(this, (index + 1) * -1);
                            } else if (((bitField & 33554432) !== 0)) {
                                ret = maybePromise._value();
                            } else if (((bitField & 16777216) !== 0)) {
                                return this._reject(maybePromise._reason());
                            } else {
                                return this._cancel();
                            }
                        }
                        values[index] = ret;
                    }
                    var totalResolved = ++this._totalResolved;
                    if (totalResolved >= length) {
                        if (preservedValues !== null) {
                            this._filter(values, preservedValues);
                        } else {
                            this._resolve(values);
                        }

                    }
                };

                MappingPromiseArray.prototype._drainQueue = function () {
                    var queue = this._queue;
                    var limit = this._limit;
                    var values = this._values;
                    while (queue.length > 0 && this._inFlight < limit) {
                        if (this._isResolved()) return;
                        var index = queue.pop();
                        this._promiseFulfilled(values[index], index);
                    }
                };

                MappingPromiseArray.prototype._filter = function (booleans, values) {
                    var len = values.length;
                    var ret = new Array(len);
                    var j = 0;
                    for (var i = 0; i < len; ++i) {
                        if (booleans[i]) ret[j++] = values[i];
                    }
                    ret.length = j;
                    this._resolve(ret);
                };

                MappingPromiseArray.prototype.preservedValues = function () {
                    return this._preservedValues;
                };

                function map(promises, fn, options, _filter) {
                    if (typeof fn !== "function") {
                        return apiRejection("expecting a function but got " + util.classString(fn));
                    }
                    var limit = typeof options === "object" && options !== null
                        ? options.concurrency
                        : 0;
                    limit = typeof limit === "number" &&
                    isFinite(limit) && limit >= 1 ? limit : 0;
                    return new MappingPromiseArray(promises, fn, limit, _filter).promise();
                }

                Promise.prototype.map = function (fn, options) {
                    return map(this, fn, options, null);
                };

                Promise.map = function (promises, fn, options, _filter) {
                    return map(promises, fn, options, _filter);
                };

            };

        }, {"./util": 36}],
        19: [function (_dereq_, module, exports) {
            "use strict";
            module.exports =
                function (Promise, INTERNAL, tryConvertToPromise, apiRejection, debug) {
                    var util = _dereq_("./util");
                    var tryCatch = util.tryCatch;

                    Promise.method = function (fn) {
                        if (typeof fn !== "function") {
                            throw new Promise.TypeError("expecting a function but got " + util.classString(fn));
                        }
                        return function () {
                            var ret = new Promise(INTERNAL);
                            ret._captureStackTrace();
                            ret._pushContext();
                            var value = tryCatch(fn).apply(this, arguments);
                            ret._popContext();
                            ret._resolveFromSyncValue(value);
                            return ret;
                        };
                    };

                    Promise.attempt = Promise["try"] = function (fn) {
                        if (typeof fn !== "function") {
                            return apiRejection("expecting a function but got " + util.classString(fn));
                        }
                        var ret = new Promise(INTERNAL);
                        ret._captureStackTrace();
                        ret._pushContext();
                        var value;
                        if (arguments.length > 1) {
                            debug.deprecated("calling Promise.try with more than 1 argument");
                            var arg = arguments[1];
                            var ctx = arguments[2];
                            value = util.isArray(arg) ? tryCatch(fn).apply(ctx, arg)
                                : tryCatch(fn).call(ctx, arg);
                        } else {
                            value = tryCatch(fn)();
                        }
                        ret._popContext();
                        ret._resolveFromSyncValue(value);
                        return ret;
                    };

                    Promise.prototype._resolveFromSyncValue = function (value) {
                        if (value === util.errorObj) {
                            this._rejectCallback(value.e, false);
                        } else {
                            this._resolveCallback(value, true);
                        }
                    };
                };

        }, {"./util": 36}],
        20: [function (_dereq_, module, exports) {
            "use strict";
            var util = _dereq_("./util");
            var maybeWrapAsError = util.maybeWrapAsError;
            var errors = _dereq_("./errors");
            var OperationalError = errors.OperationalError;
            var es5 = _dereq_("./es5");

            function isUntypedError(obj) {
                return obj instanceof Error &&
                    es5.getPrototypeOf(obj) === Error.prototype;
            }

            var rErrorKey = /^(?:name|message|stack|cause)$/;

            function wrapAsOperationalError(obj) {
                var ret;
                if (isUntypedError(obj)) {
                    ret = new OperationalError(obj);
                    ret.name = obj.name;
                    ret.message = obj.message;
                    ret.stack = obj.stack;
                    var keys = es5.keys(obj);
                    for (var i = 0; i < keys.length; ++i) {
                        var key = keys[i];
                        if (!rErrorKey.test(key)) {
                            ret[key] = obj[key];
                        }
                    }
                    return ret;
                }
                util.markAsOriginatingFromRejection(obj);
                return obj;
            }

            function nodebackForPromise(promise, multiArgs) {
                return function (err, value) {
                    if (promise === null) return;
                    if (err) {
                        var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
                        promise._attachExtraTrace(wrapped);
                        promise._reject(wrapped);
                    } else if (!multiArgs) {
                        promise._fulfill(value);
                    } else {
                        var args = [].slice.call(arguments, 1);
                        ;
                        promise._fulfill(args);
                    }
                    promise = null;
                };
            }

            module.exports = nodebackForPromise;

        }, {"./errors": 12, "./es5": 13, "./util": 36}],
        21: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise) {
                var util = _dereq_("./util");
                var async = Promise._async;
                var tryCatch = util.tryCatch;
                var errorObj = util.errorObj;

                function spreadAdapter(val, nodeback) {
                    var promise = this;
                    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
                    var ret = tryCatch(nodeback).apply(promise._boundTo, [null].concat(val));
                    if (ret === errorObj) {
                        async.throwLater(ret.e);
                    }
                }

                function successAdapter(val, nodeback) {
                    var promise = this;
                    var receiver = promise._boundTo;
                    var ret = val === undefined
                        ? tryCatch(nodeback).call(receiver, null)
                        : tryCatch(nodeback).call(receiver, null, val);
                    if (ret === errorObj) {
                        async.throwLater(ret.e);
                    }
                }

                function errorAdapter(reason, nodeback) {
                    var promise = this;
                    if (!reason) {
                        var newReason = new Error(reason + "");
                        newReason.cause = reason;
                        reason = newReason;
                    }
                    var ret = tryCatch(nodeback).call(promise._boundTo, reason);
                    if (ret === errorObj) {
                        async.throwLater(ret.e);
                    }
                }

                Promise.prototype.nodeify = function (nodeback, options) {
                    if (typeof nodeback == "function") {
                        var adapter = successAdapter;
                        if (options !== undefined && Object(options).spread) {
                            adapter = spreadAdapter;
                        }
                        this._then(
                            adapter,
                            errorAdapter,
                            undefined,
                            this,
                            nodeback
                        );
                    }
                    return this;
                };
            };

        }, {"./util": 36}],
        22: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function () {
                var makeSelfResolutionError = function () {
                    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/LhFpo0\u000a");
                };
                var reflectHandler = function () {
                    return new Promise.PromiseInspection(this._target());
                };
                var apiRejection = function (msg) {
                    return Promise.reject(new TypeError(msg));
                };
                var util = _dereq_("./util");
                var es5 = _dereq_("./es5");
                var Async = _dereq_("./async");
                var async = new Async();
                es5.defineProperty(Promise, "_async", {value: async});
                var errors = _dereq_("./errors");
                var TypeError = Promise.TypeError = errors.TypeError;
                Promise.RangeError = errors.RangeError;
                Promise.CancellationError = errors.CancellationError;
                Promise.TimeoutError = errors.TimeoutError;
                Promise.OperationalError = errors.OperationalError;
                Promise.RejectionError = errors.OperationalError;
                Promise.AggregateError = errors.AggregateError;
                var INTERNAL = function () {};
                var APPLY = {};
                var NEXT_FILTER = {};
                var tryConvertToPromise = _dereq_("./thenables")(Promise, INTERNAL);
                var PromiseArray =
                    _dereq_("./promise_array")(Promise, INTERNAL,
                        tryConvertToPromise, apiRejection);
                var Context = _dereq_("./context")(Promise);
                /*jshint unused:false*/
                var createContext = Context.create;
                var debug = _dereq_("./debuggability")(Promise, Context);
                var CapturedTrace = debug.CapturedTrace;
                var finallyHandler = _dereq_("./finally")(Promise, tryConvertToPromise);
                var catchFilter = _dereq_("./catch_filter")(NEXT_FILTER);
                var nodebackForPromise = _dereq_("./nodeback");
                var errorObj = util.errorObj;
                var tryCatch = util.tryCatch;

                function check(self, executor) {
                    if (typeof executor !== "function") {
                        throw new TypeError("expecting a function but got " + util.classString(executor));
                    }
                    if (self.constructor !== Promise) {
                        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/KsIlge\u000a");
                    }
                }

                function Promise(executor) {
                    this._bitField = 0;
                    this._fulfillmentHandler0 = undefined;
                    this._rejectionHandler0 = undefined;
                    this._promise0 = undefined;
                    this._receiver0 = undefined;
                    if (executor !== INTERNAL) {
                        check(this, executor);
                        this._resolveFromExecutor(executor);
                    }
                    this._promiseCreated();
                }

                Promise.prototype.toString = function () {
                    return "[object Promise]";
                };

                Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
                    var len = arguments.length;
                    if (len > 1) {
                        var catchInstances = new Array(len - 1),
                            j = 0, i;
                        for (i = 0; i < len - 1; ++i) {
                            var item = arguments[i];
                            if (util.isObject(item)) {
                                catchInstances[j++] = item;
                            } else {
                                return apiRejection("expecting an object but got " + util.classString(item));
                            }
                        }
                        catchInstances.length = j;
                        fn = arguments[i];
                        return this.then(undefined, catchFilter(catchInstances, fn, this));
                    }
                    return this.then(undefined, fn);
                };

                Promise.prototype.reflect = function () {
                    return this._then(reflectHandler,
                        reflectHandler, undefined, this, undefined);
                };

                Promise.prototype.then = function (didFulfill, didReject) {
                    if (debug.warnings() && arguments.length > 0 &&
                        typeof didFulfill !== "function" &&
                        typeof didReject !== "function") {
                        var msg = ".then() only accepts functions but was passed: " +
                            util.classString(didFulfill);
                        if (arguments.length > 1) {
                            msg += ", " + util.classString(didReject);
                        }
                        this._warn(msg);
                    }
                    return this._then(didFulfill, didReject, undefined, undefined, undefined);
                };

                Promise.prototype.done = function (didFulfill, didReject) {
                    var promise =
                        this._then(didFulfill, didReject, undefined, undefined, undefined);
                    promise._setIsFinal();
                };

                Promise.prototype.spread = function (fn) {
                    if (typeof fn !== "function") {
                        return apiRejection("expecting a function but got " + util.classString(fn));
                    }
                    return this.all()._then(fn, undefined, undefined, APPLY, undefined);
                };

                Promise.prototype.toJSON = function () {
                    var ret = {
                        isFulfilled: false,
                        isRejected: false,
                        fulfillmentValue: undefined,
                        rejectionReason: undefined
                    };
                    if (this.isFulfilled()) {
                        ret.fulfillmentValue = this.value();
                        ret.isFulfilled = true;
                    } else if (this.isRejected()) {
                        ret.rejectionReason = this.reason();
                        ret.isRejected = true;
                    }
                    return ret;
                };

                Promise.prototype.all = function () {
                    if (arguments.length > 0) {
                        this._warn(".all() was passed arguments but it does not take any");
                    }
                    return new PromiseArray(this).promise();
                };

                Promise.prototype.error = function (fn) {
                    return this.caught(util.originatesFromRejection, fn);
                };

                Promise.is = function (val) {
                    return val instanceof Promise;
                };

                Promise.fromNode = function (fn) {
                    var ret = new Promise(INTERNAL);
                    var multiArgs = arguments.length > 1 ? !!Object(arguments[1]).multiArgs
                        : false;
                    var result = tryCatch(fn)(nodebackForPromise(ret, multiArgs));
                    if (result === errorObj) {
                        ret._rejectCallback(result.e, true);
                    }
                    if (!ret._isFateSealed()) ret._setAsyncGuaranteed();
                    return ret;
                };

                Promise.all = function (promises) {
                    return new PromiseArray(promises).promise();
                };

                Promise.cast = function (obj) {
                    var ret = tryConvertToPromise(obj);
                    if (!(ret instanceof Promise)) {
                        ret = new Promise(INTERNAL);
                        ret._setFulfilled();
                        ret._rejectionHandler0 = obj;
                    }
                    return ret;
                };

                Promise.resolve = Promise.fulfilled = Promise.cast;

                Promise.reject = Promise.rejected = function (reason) {
                    var ret = new Promise(INTERNAL);
                    ret._captureStackTrace();
                    ret._rejectCallback(reason, true);
                    return ret;
                };

                Promise.setScheduler = function (fn) {
                    if (typeof fn !== "function") {
                        throw new TypeError("expecting a function but got " + util.classString(fn));
                    }
                    var prev = async._schedule;
                    async._schedule = fn;
                    return prev;
                };

                Promise.prototype._then = function (didFulfill,
                                                    didReject,
                                                    _, receiver,
                                                    internalData) {
                    var haveInternalData = internalData !== undefined;
                    var promise = haveInternalData ? internalData : new Promise(INTERNAL);

                    if (!haveInternalData) {
                        promise._propagateFrom(this, 3);
                        promise._captureStackTrace();
                        if (receiver === undefined &&
                            ((this._bitField & 2097152) !== 0)) {
                            receiver = this._boundTo;
                        }
                    }

                    var target = this._target();
                    var bitField = target._bitField;
                    if (!((bitField & 50397184) === 0)) {
                        var handler, value;
                        if (((bitField & 16842752) !== 0)) {
                            value = target._fulfillmentHandler0;
                            handler = didReject;
                            target._unsetRejectionIsUnhandled();
                        } else {
                            value = target._rejectionHandler0;
                            handler = didFulfill;
                        }
                        async.invoke(target._settlePromiseCtx, target, {
                            handler: handler,
                            promise: promise,
                            receiver: receiver,
                            value: value
                        });
                    } else {
                        target._addCallbacks(didFulfill, didReject, promise, receiver);
                    }

                    return promise;
                };

                Promise.prototype._length = function () {
                    return this._bitField & 65535;
                };

                Promise.prototype._isFateSealed = function () {
                    return (this._bitField & 117506048) !== 0;
                };

                Promise.prototype._isFollowing = function () {
                    return (this._bitField & 67108864) === 67108864;
                };

                Promise.prototype._setLength = function (len) {
                    this._bitField = (this._bitField & -65536) |
                    (len & 65535);
                };

                Promise.prototype._setFulfilled = function () {
                    this._bitField = this._bitField | 33554432;
                };

                Promise.prototype._setRejected = function () {
                    this._bitField = this._bitField | 16777216;
                };

                Promise.prototype._setFollowing = function () {
                    this._bitField = this._bitField | 67108864;
                };

                Promise.prototype._setIsFinal = function () {
                    this._bitField = this._bitField | 4194304;
                };

                Promise.prototype._isFinal = function () {
                    return (this._bitField & 4194304) > 0;
                };

                Promise.prototype._unsetCancelled = function () {
                    this._bitField = this._bitField & (~65536);
                };

                Promise.prototype._setCancelled = function () {
                    this._bitField = this._bitField | 65536;
                };

                Promise.prototype._setAsyncGuaranteed = function () {
                    this._bitField = this._bitField | 134217728;
                };

                Promise.prototype._receiverAt = function (index) {
                    var ret = this[
                    index * 4 - 4 + 3];
                    if (ret === undefined && this._isBound()) {
                        return this._boundTo;
                    }
                    return ret;
                };

                Promise.prototype._promiseAt = function (index) {
                    return this[
                    index * 4 - 4 + 2];
                };

                Promise.prototype._fulfillmentHandlerAt = function (index) {
                    return this[
                    index * 4 - 4 + 0];
                };

                Promise.prototype._rejectionHandlerAt = function (index) {
                    return this[
                    index * 4 - 4 + 1];
                };

                Promise.prototype._migrateCallback0 = function (follower) {
                    var bitField = follower._bitField;
                    var fulfill = follower._fulfillmentHandler0;
                    var reject = follower._rejectionHandler0;
                    var promise = follower._promise0;
                    var receiver = follower._receiver0;
                    if (((bitField & 2097152) !== 0) &&
                        receiver === undefined) {
                        receiver = follower._boundTo;
                    }
                    this._addCallbacks(fulfill, reject, promise, receiver);
                };

                Promise.prototype._migrateCallbackAt = function (follower, index) {
                    var fulfill = follower._fulfillmentHandlerAt(index);
                    var reject = follower._rejectionHandlerAt(index);
                    var promise = follower._promiseAt(index);
                    var receiver = follower._receiverAt(index);
                    this._addCallbacks(fulfill, reject, promise, receiver);
                };

                Promise.prototype._addCallbacks = function (fulfill,
                                                            reject,
                                                            promise,
                                                            receiver) {
                    var index = this._length();

                    if (index >= 65535 - 4) {
                        index = 0;
                        this._setLength(0);
                    }

                    if (index === 0) {
                        this._promise0 = promise;
                        if (receiver !== undefined) this._receiver0 = receiver;
                        if (typeof fulfill === "function") this._fulfillmentHandler0 = fulfill;
                        if (typeof reject === "function") this._rejectionHandler0 = reject;
                    } else {
                        var base = index * 4 - 4;
                        this[base + 2] = promise;
                        this[base + 3] = receiver;
                        if (typeof fulfill === "function")
                            this[base + 0] = fulfill;
                        if (typeof reject === "function")
                            this[base + 1] = reject;
                    }
                    this._setLength(index + 1);
                    return index;
                };

                Promise.prototype._proxyPromiseArray = function (promiseArray, index) {
                    this._addCallbacks(undefined, undefined, index, promiseArray);
                };

                Promise.prototype._resolveCallback = function (value, shouldBind) {
                    if (((this._bitField & 117506048) !== 0)) return;
                    if (value === this)
                        return this._rejectCallback(makeSelfResolutionError(), false);
                    var maybePromise = tryConvertToPromise(value, this);
                    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

                    if (shouldBind) this._propagateFrom(maybePromise, 2);

                    var promise = maybePromise._target();
                    var bitField = promise._bitField;
                    if (((bitField & 50397184) === 0)) {
                        var len = this._length();
                        if (len > 0) promise._migrateCallback0(this);
                        for (var i = 1; i < len; ++i) {
                            promise._migrateCallbackAt(this, i);
                        }
                        this._setFollowing();
                        this._setLength(0);
                        this._setFollowee(promise);
                        if (this._onCancel() !== undefined) {
                            promise._attachCancellationCallback(this._onCancel(), this);
                            this._unsetOnCancel();
                        }
                    } else if (((bitField & 33554432) !== 0)) {
                        this._fulfill(promise._value());
                    } else if (((bitField & 16777216) !== 0)) {
                        this._reject(promise._reason());
                    } else {
                        this._cancel();
                    }
                };

                Promise.prototype._rejectCallback = function (reason, synchronous) {
                    var trace = util.ensureErrorObject(reason);
                    var hasStack = trace === reason;
                    if (!hasStack && debug.warnings()) {
                        var message = "a promise was rejected with a non-error: " +
                            util.classString(reason);
                        this._warn(message, true);
                    }
                    this._attachExtraTrace(trace, synchronous ? hasStack : false);
                    this._reject(reason);
                };

                Promise.prototype._execute = function (executor, resolve, reject) {
                    try {
                        executor(resolve, reject);
                    } catch (e) {
                        return e;
                    }
                };

                Promise.prototype._resolveFromExecutor = function (executor) {
                    var promise = this;
                    this._captureStackTrace();
                    this._pushContext();
                    var synchronous = true;
                    var r = this._execute(executor, function (value) {
                        promise._resolveCallback(value);
                    }, function (reason) {
                        promise._rejectCallback(reason, synchronous);
                    });
                    synchronous = false;
                    this._popContext();

                    if (r !== undefined) {
                        promise._rejectCallback(r, true);
                    }
                };

                Promise.prototype._settlePromiseFromHandler = function (handler, receiver, value, promise) {
                    var bitField = promise._bitField;
                    if (((bitField & 16842752) !== 0)) {
                        if (((bitField & 16777216) !== 0)) return;
                        promise._unsetCancelled();
                    }
                    promise._pushContext();
                    var x;
                    if (receiver === APPLY) {
                        if (!value || typeof value.length !== "number") {
                            x = errorObj;
                            x.e = new TypeError("cannot .spread() a non-array: " +
                            util.classString(value));
                        } else {
                            x = tryCatch(handler).apply(this._boundTo, value);
                        }
                    } else {
                        x = tryCatch(handler).call(receiver, value);
                    }
                    var promisesCreatedDuringHandlerInvocation = promise._popContext();

                    if (x === NEXT_FILTER) {
                        promise._reject(value);
                    } else if (x === errorObj || x === promise) {
                        var err = x === promise ? makeSelfResolutionError() : x.e;
                        promise._rejectCallback(err, false);
                    } else {
                        if (x === undefined &&
                            promisesCreatedDuringHandlerInvocation > 0 &&
                            debug.longStackTraces() &&
                            debug.warnings()) {
                            promise._warn("a promise was created in a handler but " +
                            "none were returned from it", true);
                        }
                        promise._resolveCallback(x);
                    }
                };

                Promise.prototype._target = function () {
                    var ret = this;
                    while (ret._isFollowing()) ret = ret._followee();
                    return ret;
                };

                Promise.prototype._followee = function () {
                    return this._rejectionHandler0;
                };

                Promise.prototype._setFollowee = function (promise) {
                    this._rejectionHandler0 = promise;
                };

                Promise.prototype._settlePromise = function (promise, handler, receiver, value) {
                    var isPromise = promise instanceof Promise;
                    var bitField = this._bitField;
                    var asyncGuaranteed = ((bitField & 134217728) !== 0);
                    if (((bitField & 65536) !== 0)) {
                        if (isPromise && promise.isCancellable()
                            && promise._onCancel() !== undefined) {
                            promise._invokeOnCancel(promise._onCancel());
                        }
                        if (handler === finallyHandler) {
                            receiver.cancelPromise = promise;
                            if (tryCatch(handler).call(receiver, value) === errorObj) {
                                promise._reject(errorObj.e);
                            }
                        } else if (receiver instanceof PromiseArray) {
                            receiver._promiseCancelled(promise);
                        } else if (isPromise || promise instanceof PromiseArray) {
                            promise._cancel();
                        } else {
                            receiver.cancel();
                        }
                    } else if (typeof handler === "function") {
                        if (!isPromise) {
                            handler.call(receiver, value, promise);
                        } else {
                            if (asyncGuaranteed) promise._setAsyncGuaranteed();
                            this._settlePromiseFromHandler(handler, receiver, value, promise);
                        }
                    } else if (receiver instanceof PromiseArray) {
                        if (!receiver._isResolved()) {
                            if (((bitField & 33554432) !== 0)) {
                                receiver._promiseFulfilled(value, promise);
                            } else {
                                receiver._promiseRejected(value, promise);
                            }
                        }
                    } else if (isPromise) {
                        if (asyncGuaranteed) promise._setAsyncGuaranteed();
                        if (((bitField & 33554432) !== 0)) {
                            promise._fulfill(value);
                        } else {
                            promise._reject(value);
                        }
                    }
                };

                Promise.prototype._settlePromiseCtx = function (ctx) {
                    this._settlePromise(ctx.promise, ctx.handler, ctx.receiver, ctx.value);
                };

                Promise.prototype._settlePromise0 = function (handler, value, bitField) {
                    var promise = this._promise0;
                    var receiver = this._receiver0;
                    if (receiver === undefined) {
                        if (((bitField & 2097152) !== 0)) receiver = this._boundTo;
                    } else {
                        this._receiver0 = undefined;
                    }
                    this._promise0 = undefined;
                    this._settlePromise(promise, handler, receiver, value);
                };

                Promise.prototype._clearCallbackDataAtIndex = function (index) {
                    var base = index * 4 - 4;
                    this[base + 2] =
                        this[base + 3] =
                            this[base + 0] =
                                this[base + 1] = undefined;
                };

                Promise.prototype._fulfill = function (value) {
                    var bitField = this._bitField;
                    if (((bitField & 117506048) >>> 16)) return;
                    if (value === this) {
                        var err = makeSelfResolutionError();
                        this._attachExtraTrace(err);
                        return this._reject(err);
                    }
                    this._setFulfilled();
                    this._rejectionHandler0 = value;

                    if ((bitField & 65535) > 0) {
                        if (((bitField & 134217728) !== 0)) {
                            this._settlePromises();
                        } else {
                            async.settlePromises(this);
                        }
                    }
                };

                Promise.prototype._reject = function (reason) {
                    var bitField = this._bitField;
                    if (((bitField & 117506048) >>> 16)) return;
                    this._setRejected();
                    this._fulfillmentHandler0 = reason;

                    if (this._isFinal()) {
                        return async.fatalError(reason, util.isNode);
                    }

                    if ((bitField & 65535) > 0) {
                        if (((bitField & 134217728) !== 0)) {
                            this._settlePromises();
                        } else {
                            async.settlePromises(this);
                        }
                    } else {
                        this._ensurePossibleRejectionHandled();
                    }
                };

                Promise.prototype._fulfillPromises = function (len, value) {
                    for (var i = 1; i < len; i++) {
                        var handler = this._fulfillmentHandlerAt(i);
                        var promise = this._promiseAt(i);
                        var receiver = this._receiverAt(i);
                        this._clearCallbackDataAtIndex(i);
                        this._settlePromise(promise, handler, receiver, value);
                    }
                };

                Promise.prototype._rejectPromises = function (len, reason) {
                    for (var i = 1; i < len; i++) {
                        var handler = this._rejectionHandlerAt(i);
                        var promise = this._promiseAt(i);
                        var receiver = this._receiverAt(i);
                        this._clearCallbackDataAtIndex(i);
                        this._settlePromise(promise, handler, receiver, reason);
                    }
                };

                Promise.prototype._settlePromises = function () {
                    var bitField = this._bitField;
                    var len = (bitField & 65535);
                    if (((bitField & 16842752) !== 0)) {
                        var reason = this._fulfillmentHandler0;
                        this._settlePromise0(this._rejectionHandler0, reason, bitField);
                        this._rejectPromises(len, reason);
                    } else {
                        var value = this._rejectionHandler0;
                        this._settlePromise0(this._fulfillmentHandler0, value, bitField);
                        this._fulfillPromises(len, value);
                    }
                    this._setLength(0);
                    this._clearCancellationData();
                };

                Promise.prototype._settledValue = function () {
                    var bitField = this._bitField;
                    if (((bitField & 33554432) !== 0)) {
                        return this._rejectionHandler0;
                    } else if (((bitField & 16777216) !== 0)) {
                        return this._fulfillmentHandler0;
                    }
                };

                function deferResolve(v) {this.promise._resolveCallback(v);}

                function deferReject(v) {this.promise._rejectCallback(v, false);}

                Promise.defer = function () {
                    debug.deprecated("Promise.defer", "new Promise");
                    var promise = new Promise(INTERNAL);
                    return {
                        promise: promise,
                        resolve: deferResolve,
                        reject: deferReject
                    };
                };

                Promise._makeSelfResolutionError = makeSelfResolutionError;
                _dereq_("./method")(Promise, INTERNAL, tryConvertToPromise, apiRejection, debug);
                _dereq_("./bind")(Promise, INTERNAL, tryConvertToPromise, debug);
                _dereq_("./cancel")(Promise, PromiseArray, apiRejection, debug);
                _dereq_("./direct_resolve")(Promise);
                _dereq_("./synchronous_inspection")(Promise);
                _dereq_("./join")(
                    Promise, PromiseArray, tryConvertToPromise, INTERNAL, debug);
                Promise.Promise = Promise;
                _dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
                _dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext, INTERNAL, debug);
                _dereq_('./timers.js')(Promise, INTERNAL);
                _dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise);
                _dereq_('./nodeify.js')(Promise);
                _dereq_('./call_get.js')(Promise);
                _dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
                _dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
                _dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL, debug);
                _dereq_('./settle.js')(Promise, PromiseArray, debug);
                _dereq_('./some.js')(Promise, PromiseArray, apiRejection);
                _dereq_('./promisify.js')(Promise, INTERNAL);
                _dereq_('./any.js')(Promise);
                _dereq_('./each.js')(Promise, INTERNAL);
                _dereq_('./filter.js')(Promise, INTERNAL);

                util.toFastProperties(Promise);
                util.toFastProperties(Promise.prototype);
                function fillTypes(value) {
                    var p = new Promise(INTERNAL);
                    p._fulfillmentHandler0 = value;
                    p._rejectionHandler0 = value;
                    p._promise0 = value;
                    p._receiver0 = value;
                }

                // Complete slack tracking, opt out of field-type tracking and
                // stabilize map
                fillTypes({a: 1});
                fillTypes({b: 2});
                fillTypes({c: 3});
                fillTypes(1);
                fillTypes(function () {});
                fillTypes(undefined);
                fillTypes(false);
                fillTypes(new Promise(INTERNAL));
                debug.setBounds(Async.firstLineError, util.lastLineError);
                return Promise;

            };

        }, {
            "./any.js": 1,
            "./async": 2,
            "./bind": 3,
            "./call_get.js": 5,
            "./cancel": 6,
            "./catch_filter": 7,
            "./context": 8,
            "./debuggability": 9,
            "./direct_resolve": 10,
            "./each.js": 11,
            "./errors": 12,
            "./es5": 13,
            "./filter.js": 14,
            "./finally": 15,
            "./generators.js": 16,
            "./join": 17,
            "./map.js": 18,
            "./method": 19,
            "./nodeback": 20,
            "./nodeify.js": 21,
            "./promise_array": 23,
            "./promisify.js": 24,
            "./props.js": 25,
            "./race.js": 27,
            "./reduce.js": 28,
            "./settle.js": 30,
            "./some.js": 31,
            "./synchronous_inspection": 32,
            "./thenables": 33,
            "./timers.js": 34,
            "./using.js": 35,
            "./util": 36
        }],
        23: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL, tryConvertToPromise,
                                       apiRejection) {
                var util = _dereq_("./util");
                var isArray = util.isArray;

                function toResolutionValue(val) {
                    switch (val) {
                        case -2:
                            return [];
                        case -3:
                            return {};
                    }
                }

                function PromiseArray(values) {
                    var promise = this._promise = new Promise(INTERNAL);
                    if (values instanceof Promise) {
                        promise._propagateFrom(values, 3);
                    }
                    promise._setOnCancel(this);
                    this._values = values;
                    this._length = 0;
                    this._totalResolved = 0;
                    this._init(undefined, -2);
                }

                PromiseArray.prototype.length = function () {
                    return this._length;
                };

                PromiseArray.prototype.promise = function () {
                    return this._promise;
                };

                PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
                    var values = tryConvertToPromise(this._values, this._promise);
                    if (values instanceof Promise) {
                        values = values._target();
                        var bitField = values._bitField;
                        ;
                        this._values = values;

                        if (((bitField & 50397184) === 0)) {
                            this._promise._setAsyncGuaranteed();
                            return values._then(
                                init,
                                this._reject,
                                undefined,
                                this,
                                resolveValueIfEmpty
                            );
                        } else if (((bitField & 33554432) !== 0)) {
                            values = values._value();
                        } else if (((bitField & 16777216) !== 0)) {
                            return this._reject(values._reason());
                        } else {
                            return this._cancel();
                        }
                    }
                    if (!isArray(values)) {
                        var err = apiRejection(
                            "expecting an array but got " + util.classString(values)).reason();
                        this._promise._rejectCallback(err, false);
                        return;
                    }

                    if (values.length === 0) {
                        if (resolveValueIfEmpty === -5) {
                            this._resolveEmptyArray();
                        }
                        else {
                            this._resolve(toResolutionValue(resolveValueIfEmpty));
                        }
                        return;
                    }
                    this._iterate(values);
                };

                PromiseArray.prototype._iterate = function (values) {
                    var len = this.getActualLength(values.length);
                    this._length = len;
                    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
                    var promise = this._promise;
                    var isResolved;
                    for (var i = 0; i < len; ++i) {
                        isResolved = this._isResolved();
                        var maybePromise = tryConvertToPromise(values[i], promise);
                        if (maybePromise instanceof Promise) {
                            maybePromise = maybePromise._target();
                            var bitField = maybePromise._bitField;
                            ;
                            if (((bitField & 50397184) === 0)) {
                                maybePromise._proxyPromiseArray(this, i);
                                this._values[i] = maybePromise;
                            } else if (isResolved) {
                                maybePromise._unsetRejectionIsUnhandled();
                            } else if (((bitField & 33554432) !== 0)) {
                                this._promiseFulfilled(maybePromise._value(), i);
                            } else if (((bitField & 16777216) !== 0)) {
                                this._promiseRejected(maybePromise._reason(), i);
                            } else {
                                this._promiseCancelled(i);
                            }
                        } else if (!isResolved) {
                            this._promiseFulfilled(maybePromise, i);
                        }
                    }
                    if (!isResolved) promise._setAsyncGuaranteed();
                };

                PromiseArray.prototype._isResolved = function () {
                    return this._values === null;
                };

                PromiseArray.prototype._resolve = function (value) {
                    this._values = null;
                    this._promise._fulfill(value);
                };

                PromiseArray.prototype._cancel = function () {
                    if (this._isResolved() || !this._promise.isCancellable()) return;
                    this._values = null;
                    this._promise._cancel();
                };

                PromiseArray.prototype._reject = function (reason) {
                    this._values = null;
                    this._promise._rejectCallback(reason, false);
                };

                PromiseArray.prototype._promiseFulfilled = function (value, index) {
                    this._values[index] = value;
                    var totalResolved = ++this._totalResolved;
                    if (totalResolved >= this._length) {
                        this._resolve(this._values);
                    }
                };

                PromiseArray.prototype._promiseCancelled = function () {
                    this._cancel();
                };

                PromiseArray.prototype._promiseRejected = function (reason) {
                    this._totalResolved++;
                    this._reject(reason);
                };

                PromiseArray.prototype._resultCancelled = function () {
                    if (this._isResolved()) return;
                    var values = this._values;
                    this._cancel();
                    if (values instanceof Promise) {
                        values.cancel();
                    } else {
                        for (var i = 0; i < values.length; ++i) {
                            if (values[i] instanceof Promise) {
                                values[i].cancel();
                            }
                        }
                    }
                };

                PromiseArray.prototype.shouldCopyValues = function () {
                    return true;
                };

                PromiseArray.prototype.getActualLength = function (len) {
                    return len;
                };

                return PromiseArray;
            };

        }, {"./util": 36}],
        24: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL) {
                var THIS = {};
                var util = _dereq_("./util");
                var nodebackForPromise = _dereq_("./nodeback");
                var withAppended = util.withAppended;
                var maybeWrapAsError = util.maybeWrapAsError;
                var canEvaluate = util.canEvaluate;
                var TypeError = _dereq_("./errors").TypeError;
                var defaultSuffix = "Async";
                var defaultPromisified = {__isPromisified__: true};
                var noCopyPropsPattern =
                    /^(?:length|name|arguments|caller|prototype|__isPromisified__)$/;
                var defaultFilter = function (name, func) {
                    return util.isIdentifier(name) &&
                        name.charAt(0) !== "_" && !util.isClass(func);
                };

                function propsFilter(key) {
                    return !noCopyPropsPattern.test(key);
                }

                function isPromisified(fn) {
                    try {
                        return fn.__isPromisified__ === true;
                    }
                    catch (e) {
                        return false;
                    }
                }

                function hasPromisified(obj, key, suffix) {
                    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                        defaultPromisified);
                    return val ? isPromisified(val) : false;
                }

                function checkValid(ret, suffix, suffixRegexp) {
                    for (var i = 0; i < ret.length; i += 2) {
                        var key = ret[i];
                        if (suffixRegexp.test(key)) {
                            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
                            for (var j = 0; j < ret.length; j += 2) {
                                if (ret[j] === keyWithoutAsyncSuffix) {
                                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/iWrZbw\u000a"
                                        .replace("%s", suffix));
                                }
                            }
                        }
                    }
                }

                function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
                    var keys = util.inheritedDataKeys(obj);
                    var ret = [];
                    for (var i = 0; i < keys.length; ++i) {
                        var key = keys[i];
                        var value = obj[key];
                        var passesDefaultFilter = filter === defaultFilter
                            ? true : defaultFilter(key, value, obj);
                        if (typeof value === "function" && !isPromisified(value) && !hasPromisified(obj, key, suffix) &&
                            filter(key, value, obj, passesDefaultFilter)) {
                            ret.push(key, value);
                        }
                    }
                    checkValid(ret, suffix, suffixRegexp);
                    return ret;
                }

                var escapeIdentRegex = function (str) {
                    return str.replace(/([$])/, "\\$");
                };

                var makeNodePromisifiedEval;
                if (!true) {
                    var switchCaseArgumentOrder = function (likelyArgumentCount) {
                        var ret = [likelyArgumentCount];
                        var min = Math.max(0, likelyArgumentCount - 1 - 3);
                        for (var i = likelyArgumentCount - 1; i >= min; --i) {
                            ret.push(i);
                        }
                        for (var i = likelyArgumentCount + 1; i <= 3; ++i) {
                            ret.push(i);
                        }
                        return ret;
                    };

                    var argumentSequence = function (argumentCount) {
                        return util.filledRange(argumentCount, "_arg", "");
                    };

                    var parameterDeclaration = function (parameterCount) {
                        return util.filledRange(
                            Math.max(parameterCount, 3), "_arg", "");
                    };

                    var parameterCount = function (fn) {
                        if (typeof fn.length === "number") {
                            return Math.max(Math.min(fn.length, 1023 + 1), 0);
                        }
                        return 0;
                    };

                    makeNodePromisifiedEval =
                        function (callback, receiver, originalName, fn, _, multiArgs) {
                            var newParameterCount = Math.max(0, parameterCount(fn) - 1);
                            var argumentOrder = switchCaseArgumentOrder(newParameterCount);
                            var shouldProxyThis = typeof callback === "string" || receiver === THIS;

                            function generateCallForArgumentCount(count) {
                                var args = argumentSequence(count).join(", ");
                                var comma = count > 0 ? ", " : "";
                                var ret;
                                if (shouldProxyThis) {
                                    ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
                                } else {
                                    ret = receiver === undefined
                                        ? "ret = callback({{args}}, nodeback); break;\n"
                                        : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
                                }
                                return ret.replace("{{args}}", args).replace(", ", comma);
                            }

                            function generateArgumentSwitchCase() {
                                var ret = "";
                                for (var i = 0; i < argumentOrder.length; ++i) {
                                    ret += "case " + argumentOrder[i] + ":" +
                                    generateCallForArgumentCount(argumentOrder[i]);
                                }

                                ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                        ? "ret = callback.apply(this, args);\n"
                                        : "ret = callback.apply(receiver, args);\n"));
                                return ret;
                            }

                            var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['" + callback + "'] : fn")
                                : "fn";
                            var body = "'use strict';                                                \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise, " + multiArgs + ");   \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true);      \n\
            }                                                                \n\
            if (!promise._isFateSealed()) promise._setAsyncGuaranteed();     \n\
            return promise;                                                  \n\
        };                                                                   \n\
        ret.__isPromisified__ = true;                                        \n\
        return ret;                                                          \n\
    ".replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
                                    .replace("[GetFunctionCode]", getFunctionCode);
                            body = body.replace("Parameters", parameterDeclaration(newParameterCount));
                            return new Function("Promise",
                                "fn",
                                "receiver",
                                "withAppended",
                                "maybeWrapAsError",
                                "nodebackForPromise",
                                "tryCatch",
                                "errorObj",
                                "INTERNAL",
                                body)(
                                Promise,
                                fn,
                                receiver,
                                withAppended,
                                maybeWrapAsError,
                                nodebackForPromise,
                                util.tryCatch,
                                util.errorObj,
                                INTERNAL);
                        };
                }

                function makeNodePromisifiedClosure(callback, receiver, _, fn, __, multiArgs) {
                    var defaultThis = (function () {return this;})();
                    var method = callback;
                    if (typeof method === "string") {
                        callback = fn;
                    }
                    function promisified() {
                        var _receiver = receiver;
                        if (receiver === THIS) _receiver = this;
                        var promise = new Promise(INTERNAL);
                        promise._captureStackTrace();
                        var cb = typeof method === "string" && this !== defaultThis
                            ? this[method] : callback;
                        var fn = nodebackForPromise(promise, multiArgs);
                        try {
                            cb.apply(_receiver, withAppended(arguments, fn));
                        } catch (e) {
                            promise._rejectCallback(maybeWrapAsError(e), true);
                        }
                        if (!promise._isFateSealed()) promise._setAsyncGuaranteed();
                        return promise;
                    }

                    promisified.__isPromisified__ = true;
                    return promisified;
                }

                var makeNodePromisified = canEvaluate
                    ? makeNodePromisifiedEval
                    : makeNodePromisifiedClosure;

                function promisifyAll(obj, suffix, filter, promisifier, multiArgs) {
                    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
                    var methods =
                        promisifiableMethods(obj, suffix, suffixRegexp, filter);

                    for (var i = 0, len = methods.length; i < len; i += 2) {
                        var key = methods[i];
                        var fn = methods[i + 1];
                        var promisifiedKey = key + suffix;
                        obj[promisifiedKey] = promisifier === makeNodePromisified
                            ? makeNodePromisified(key, THIS, key, fn, suffix, multiArgs)
                            : promisifier(fn, function () {
                            return makeNodePromisified(key, THIS,
                                key, fn, suffix, multiArgs);
                        });
                    }
                    util.toFastProperties(obj);
                    return obj;
                }

                function promisify(callback, receiver, multiArgs) {
                    return makeNodePromisified(callback, receiver, undefined,
                        callback, null, multiArgs);
                }

                Promise.promisify = function (fn, options) {
                    if (typeof fn !== "function") {
                        throw new TypeError("expecting a function but got " + util.classString(fn));
                    }
                    if (isPromisified(fn)) {
                        return fn;
                    }
                    options = Object(options);
                    var receiver = options.context === undefined ? THIS : options.context;
                    var multiArgs = !!options.multiArgs;
                    var ret = promisify(fn, receiver, multiArgs);
                    util.copyDescriptors(fn, ret, propsFilter);
                    return ret;
                };

                Promise.promisifyAll = function (target, options) {
                    if (typeof target !== "function" && typeof target !== "object") {
                        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/9ITlV0\u000a");
                    }
                    options = Object(options);
                    var multiArgs = !!options.multiArgs;
                    var suffix = options.suffix;
                    if (typeof suffix !== "string") suffix = defaultSuffix;
                    var filter = options.filter;
                    if (typeof filter !== "function") filter = defaultFilter;
                    var promisifier = options.promisifier;
                    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

                    if (!util.isIdentifier(suffix)) {
                        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/8FZo5V\u000a");
                    }

                    var keys = util.inheritedDataKeys(target);
                    for (var i = 0; i < keys.length; ++i) {
                        var value = target[keys[i]];
                        if (keys[i] !== "constructor" &&
                            util.isClass(value)) {
                            promisifyAll(value.prototype, suffix, filter, promisifier,
                                multiArgs);
                            promisifyAll(value, suffix, filter, promisifier, multiArgs);
                        }
                    }

                    return promisifyAll(target, suffix, filter, promisifier, multiArgs);
                };
            };

        }, {"./errors": 12, "./nodeback": 20, "./util": 36}],
        25: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, PromiseArray, tryConvertToPromise, apiRejection) {
                var util = _dereq_("./util");
                var isObject = util.isObject;
                var es5 = _dereq_("./es5");

                function PropertiesPromiseArray(obj) {
                    var keys = es5.keys(obj);
                    var len = keys.length;
                    var values = new Array(len * 2);
                    for (var i = 0; i < len; ++i) {
                        var key = keys[i];
                        values[i] = obj[key];
                        values[i + len] = key;
                    }
                    this.constructor$(values);
                }

                util.inherits(PropertiesPromiseArray, PromiseArray);

                PropertiesPromiseArray.prototype._init = function () {
                    this._init$(undefined, -3);
                };

                PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
                    this._values[index] = value;
                    var totalResolved = ++this._totalResolved;
                    if (totalResolved >= this._length) {
                        var val = {};
                        var keyOffset = this.length();
                        for (var i = 0, len = this.length(); i < len; ++i) {
                            val[this._values[i + keyOffset]] = this._values[i];
                        }
                        this._resolve(val);
                    }
                };

                PropertiesPromiseArray.prototype.shouldCopyValues = function () {
                    return false;
                };

                PropertiesPromiseArray.prototype.getActualLength = function (len) {
                    return len >> 1;
                };

                function props(promises) {
                    var ret;
                    var castValue = tryConvertToPromise(promises);

                    if (!isObject(castValue)) {
                        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/OsFKC8\u000a");
                    } else if (castValue instanceof Promise) {
                        ret = castValue._then(
                            Promise.props, undefined, undefined, undefined, undefined);
                    } else {
                        ret = new PropertiesPromiseArray(castValue).promise();
                    }

                    if (castValue instanceof Promise) {
                        ret._propagateFrom(castValue, 2);
                    }
                    return ret;
                }

                Promise.prototype.props = function () {
                    return props(this);
                };

                Promise.props = function (promises) {
                    return props(promises);
                };
            };

        }, {"./es5": 13, "./util": 36}],
        26: [function (_dereq_, module, exports) {
            "use strict";
            function arrayMove(src, srcIndex, dst, dstIndex, len) {
                for (var j = 0; j < len; ++j) {
                    dst[j + dstIndex] = src[j + srcIndex];
                    src[j + srcIndex] = void 0;
                }
            }

            function Queue(capacity) {
                this._capacity = capacity;
                this._length = 0;
                this._front = 0;
            }

            Queue.prototype._willBeOverCapacity = function (size) {
                return this._capacity < size;
            };

            Queue.prototype._pushOne = function (arg) {
                var length = this.length();
                this._checkCapacity(length + 1);
                var i = (this._front + length) & (this._capacity - 1);
                this[i] = arg;
                this._length = length + 1;
            };

            Queue.prototype._unshiftOne = function (value) {
                var capacity = this._capacity;
                this._checkCapacity(this.length() + 1);
                var front = this._front;
                var i = (((( front - 1 ) &
                ( capacity - 1) ) ^ capacity ) - capacity );
                this[i] = value;
                this._front = i;
                this._length = this.length() + 1;
            };

            Queue.prototype.unshift = function (fn, receiver, arg) {
                this._unshiftOne(arg);
                this._unshiftOne(receiver);
                this._unshiftOne(fn);
            };

            Queue.prototype.push = function (fn, receiver, arg) {
                var length = this.length() + 3;
                if (this._willBeOverCapacity(length)) {
                    this._pushOne(fn);
                    this._pushOne(receiver);
                    this._pushOne(arg);
                    return;
                }
                var j = this._front + length - 3;
                this._checkCapacity(length);
                var wrapMask = this._capacity - 1;
                this[(j + 0) & wrapMask] = fn;
                this[(j + 1) & wrapMask] = receiver;
                this[(j + 2) & wrapMask] = arg;
                this._length = length;
            };

            Queue.prototype.shift = function () {
                var front = this._front,
                    ret = this[front];

                this[front] = undefined;
                this._front = (front + 1) & (this._capacity - 1);
                this._length--;
                return ret;
            };

            Queue.prototype.length = function () {
                return this._length;
            };

            Queue.prototype._checkCapacity = function (size) {
                if (this._capacity < size) {
                    this._resizeTo(this._capacity << 1);
                }
            };

            Queue.prototype._resizeTo = function (capacity) {
                var oldCapacity = this._capacity;
                this._capacity = capacity;
                var front = this._front;
                var length = this._length;
                var moveItemsCount = (front + length) & (oldCapacity - 1);
                arrayMove(this, 0, this, oldCapacity, moveItemsCount);
            };

            module.exports = Queue;

        }, {}],
        27: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL, tryConvertToPromise, apiRejection) {
                var util = _dereq_("./util");

                var raceLater = function (promise) {
                    return promise.then(function (array) {
                        return race(array, promise);
                    });
                };

                function race(promises, parent) {
                    var maybePromise = tryConvertToPromise(promises);

                    if (maybePromise instanceof Promise) {
                        return raceLater(maybePromise);
                    } else if (!util.isArray(promises)) {
                        return apiRejection("expecting an array but got " + util.classString(promises));
                    }

                    var ret = new Promise(INTERNAL);
                    if (parent !== undefined) {
                        ret._propagateFrom(parent, 3);
                    }
                    var fulfill = ret._fulfill;
                    var reject = ret._reject;
                    for (var i = 0, len = promises.length; i < len; ++i) {
                        var val = promises[i];

                        if (val === undefined && !(i in promises)) {
                            continue;
                        }

                        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
                    }
                    return ret;
                }

                Promise.race = function (promises) {
                    return race(promises, undefined);
                };

                Promise.prototype.race = function () {
                    return race(this, undefined);
                };

            };

        }, {"./util": 36}],
        28: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise,
                                       PromiseArray,
                                       apiRejection,
                                       tryConvertToPromise,
                                       INTERNAL,
                                       debug) {
                var util = _dereq_("./util");
                var tryCatch = util.tryCatch;

                function ReductionPromiseArray(promises, fn, initialValue, _each) {
                    this.constructor$(promises);
                    this._fn = fn;
                    if (initialValue !== undefined) {
                        initialValue = Promise.resolve(initialValue);
                        initialValue._attachCancellationCallback(this);
                    }
                    this._initialValue = initialValue;
                    this._currentCancellable = null;
                    this._eachValues = _each === INTERNAL ? [] : undefined;
                    this._promise._captureStackTrace();
                    this._init$(undefined, -5);
                }

                util.inherits(ReductionPromiseArray, PromiseArray);

                ReductionPromiseArray.prototype._gotAccum = function (accum) {
                    if (this._eachValues !== undefined && accum !== INTERNAL) {
                        this._eachValues.push(accum);
                    }
                };

                ReductionPromiseArray.prototype._eachComplete = function (value) {
                    this._eachValues.push(value);
                    return this._eachValues;
                };

                ReductionPromiseArray.prototype._init = function () {};

                ReductionPromiseArray.prototype._resolveEmptyArray = function () {
                    this._resolve(this._eachValues !== undefined ? this._eachValues
                        : this._initialValue);
                };

                ReductionPromiseArray.prototype.shouldCopyValues = function () {
                    return false;
                };

                ReductionPromiseArray.prototype._resolve = function (value) {
                    this._promise._resolveCallback(value);
                    this._values = null;
                };

                ReductionPromiseArray.prototype._resultCancelled = function (sender) {
                    if (sender === this._initialValue) return this._cancel();
                    if (this._isResolved()) return;
                    this._resultCancelled$();
                    if (this._currentCancellable instanceof Promise) {
                        this._currentCancellable.cancel();
                    }
                    if (this._initialValue instanceof Promise) {
                        this._initialValue.cancel();
                    }
                };

                ReductionPromiseArray.prototype._iterate = function (values) {
                    this._values = values;
                    var value;
                    var i;
                    var length = values.length;
                    if (this._initialValue !== undefined) {
                        value = this._initialValue;
                        i = 0;
                    } else {
                        value = Promise.resolve(values[0]);
                        i = 1;
                    }

                    this._currentCancellable = value;

                    if (!value.isRejected()) {
                        for (; i < length; ++i) {
                            var ctx = {
                                accum: null,
                                value: values[i],
                                index: i,
                                length: length,
                                array: this
                            };
                            value = value._then(gotAccum, undefined, undefined, ctx, undefined);
                        }
                    }

                    if (this._eachValues !== undefined) {
                        value = value
                            ._then(this._eachComplete, undefined, undefined, this, undefined);
                    }
                    value._then(completed, completed, undefined, value, this);
                };

                Promise.prototype.reduce = function (fn, initialValue) {
                    return reduce(this, fn, initialValue, null);
                };

                Promise.reduce = function (promises, fn, initialValue, _each) {
                    return reduce(promises, fn, initialValue, _each);
                };

                function completed(valueOrReason, array) {
                    if (this.isFulfilled()) {
                        array._resolve(valueOrReason);
                    } else {
                        array._reject(valueOrReason);
                    }
                }

                function reduce(promises, fn, initialValue, _each) {
                    if (typeof fn !== "function") {
                        return apiRejection("expecting a function but got " + util.classString(fn));
                    }
                    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
                    return array.promise();
                }

                function gotAccum(accum) {
                    this.accum = accum;
                    this.array._gotAccum(accum);
                    var value = tryConvertToPromise(this.value, this.array._promise);
                    if (value instanceof Promise) {
                        this.array._currentCancellable = value;
                        return value._then(gotValue, undefined, undefined, this, undefined);
                    } else {
                        return gotValue.call(this, value);
                    }
                }

                function gotValue(value) {
                    var array = this.array;
                    var promise = array._promise;
                    var fn = tryCatch(array._fn);
                    promise._pushContext();
                    var ret;
                    if (array._eachValues !== undefined) {
                        ret = fn.call(promise._boundTo, value, this.index, this.length);
                    } else {
                        ret = fn.call(promise._boundTo,
                            this.accum, value, this.index, this.length);
                    }
                    if (ret instanceof Promise) {
                        array._currentCancellable = ret;
                    }
                    var promisesCreated = promise._popContext();
                    debug.checkForgottenReturns(
                        ret,
                        promisesCreated,
                        array._eachValues !== undefined ? "Promise.each" : "Promise.reduce",
                        promise
                    );
                    return ret;
                }
            };

        }, {"./util": 36}],
        29: [function (_dereq_, module, exports) {
            "use strict";
            var schedule;
            if (_dereq_("./util").isNode) {
                var version = process.versions.node.split(".").map(Number);
                schedule = (version[0] === 0 && version[1] > 10) || (version[0] > 0)
                    ? global.setImmediate : process.nextTick;
            }
            else if (typeof MutationObserver !== "undefined") {
                schedule = function (fn) {
                    var div = document.createElement("div");
                    var observer = new MutationObserver(fn);
                    observer.observe(div, {attributes: true});
                    return function () { div.classList.toggle("foo"); };
                };
                schedule.isStatic = true;
            }
            else if (typeof setTimeout !== "undefined") {
                schedule = function (fn) {
                    setTimeout(fn, 0);
                };
            }
            else {
                schedule = function () {
                    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
                };
            }
            module.exports = schedule;

        }, {"./util": 36}],
        30: [function (_dereq_, module, exports) {
            "use strict";
            module.exports =
                function (Promise, PromiseArray, debug) {
                    var PromiseInspection = Promise.PromiseInspection;
                    var util = _dereq_("./util");

                    function SettledPromiseArray(values) {
                        this.constructor$(values);
                    }

                    util.inherits(SettledPromiseArray, PromiseArray);

                    SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
                        this._values[index] = inspection;
                        var totalResolved = ++this._totalResolved;
                        if (totalResolved >= this._length) {
                            this._resolve(this._values);
                        }
                    };

                    SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
                        var ret = new PromiseInspection();
                        ret._bitField = 33554432;
                        ret._settledValueField = value;
                        this._promiseResolved(index, ret);
                    };
                    SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
                        var ret = new PromiseInspection();
                        ret._bitField = 16777216;
                        ret._settledValueField = reason;
                        this._promiseResolved(index, ret);
                    };

                    Promise.settle = function (promises) {
                        debug.deprecated(".settle()", ".reflect()");
                        return new SettledPromiseArray(promises).promise();
                    };

                    Promise.prototype.settle = function () {
                        return Promise.settle(this);
                    };
                };

        }, {"./util": 36}],
        31: [function (_dereq_, module, exports) {
            "use strict";
            module.exports =
                function (Promise, PromiseArray, apiRejection) {
                    var util = _dereq_("./util");
                    var RangeError = _dereq_("./errors").RangeError;
                    var AggregateError = _dereq_("./errors").AggregateError;
                    var isArray = util.isArray;
                    var CANCELLATION = {};

                    function SomePromiseArray(values) {
                        this.constructor$(values);
                        this._howMany = 0;
                        this._unwrap = false;
                        this._initialized = false;
                    }

                    util.inherits(SomePromiseArray, PromiseArray);

                    SomePromiseArray.prototype._init = function () {
                        if (!this._initialized) {
                            return;
                        }
                        if (this._howMany === 0) {
                            this._resolve([]);
                            return;
                        }
                        this._init$(undefined, -5);
                        var isArrayResolved = isArray(this._values);
                        if (!this._isResolved() &&
                            isArrayResolved &&
                            this._howMany > this._canPossiblyFulfill()) {
                            this._reject(this._getRangeError(this.length()));
                        }
                    };

                    SomePromiseArray.prototype.init = function () {
                        this._initialized = true;
                        this._init();
                    };

                    SomePromiseArray.prototype.setUnwrap = function () {
                        this._unwrap = true;
                    };

                    SomePromiseArray.prototype.howMany = function () {
                        return this._howMany;
                    };

                    SomePromiseArray.prototype.setHowMany = function (count) {
                        this._howMany = count;
                    };

                    SomePromiseArray.prototype._promiseFulfilled = function (value) {
                        this._addFulfilled(value);
                        if (this._fulfilled() === this.howMany()) {
                            this._values.length = this.howMany();
                            if (this.howMany() === 1 && this._unwrap) {
                                this._resolve(this._values[0]);
                            } else {
                                this._resolve(this._values);
                            }
                        }

                    };
                    SomePromiseArray.prototype._promiseRejected = function (reason) {
                        this._addRejected(reason);
                        this._checkOutcome();
                    };

                    SomePromiseArray.prototype._promiseCancelled = function () {
                        if (this._values instanceof Promise || this._values == null) {
                            return this._cancel();
                        }
                        this._addRejected(CANCELLATION);
                        this._checkOutcome();
                    };

                    SomePromiseArray.prototype._checkOutcome = function () {
                        if (this.howMany() > this._canPossiblyFulfill()) {
                            var e = new AggregateError();
                            for (var i = this.length(); i < this._values.length; ++i) {
                                if (this._values[i] !== CANCELLATION) {
                                    e.push(this._values[i]);
                                }
                            }
                            if (e.length > 0) {
                                this._reject(e);
                            } else {
                                this._cancel();
                            }
                        }
                    };

                    SomePromiseArray.prototype._fulfilled = function () {
                        return this._totalResolved;
                    };

                    SomePromiseArray.prototype._rejected = function () {
                        return this._values.length - this.length();
                    };

                    SomePromiseArray.prototype._addRejected = function (reason) {
                        this._values.push(reason);
                    };

                    SomePromiseArray.prototype._addFulfilled = function (value) {
                        this._values[this._totalResolved++] = value;
                    };

                    SomePromiseArray.prototype._canPossiblyFulfill = function () {
                        return this.length() - this._rejected();
                    };

                    SomePromiseArray.prototype._getRangeError = function (count) {
                        var message = "Input array must contain at least " +
                            this._howMany + " items but contains only " + count + " items";
                        return new RangeError(message);
                    };

                    SomePromiseArray.prototype._resolveEmptyArray = function () {
                        this._reject(this._getRangeError(0));
                    };

                    function some(promises, howMany) {
                        if ((howMany | 0) !== howMany || howMany < 0) {
                            return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/1wAmHx\u000a");
                        }
                        var ret = new SomePromiseArray(promises);
                        var promise = ret.promise();
                        ret.setHowMany(howMany);
                        ret.init();
                        return promise;
                    }

                    Promise.some = function (promises, howMany) {
                        return some(promises, howMany);
                    };

                    Promise.prototype.some = function (howMany) {
                        return some(this, howMany);
                    };

                    Promise._SomePromiseArray = SomePromiseArray;
                };

        }, {"./errors": 12, "./util": 36}],
        32: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise) {
                function PromiseInspection(promise) {
                    if (promise !== undefined) {
                        promise = promise._target();
                        this._bitField = promise._bitField;
                        this._settledValueField = promise._isFateSealed()
                            ? promise._settledValue() : undefined;
                    }
                    else {
                        this._bitField = 0;
                        this._settledValueField = undefined;
                    }
                }

                PromiseInspection.prototype._settledValue = function () {
                    return this._settledValueField;
                };

                var value = PromiseInspection.prototype.value = function () {
                    if (!this.isFulfilled()) {
                        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
                    }
                    return this._settledValue();
                };

                var reason = PromiseInspection.prototype.error =
                    PromiseInspection.prototype.reason = function () {
                        if (!this.isRejected()) {
                            throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
                        }
                        return this._settledValue();
                    };

                var isFulfilled = PromiseInspection.prototype.isFulfilled = function () {
                    return (this._bitField & 33554432) !== 0;
                };

                var isRejected = PromiseInspection.prototype.isRejected = function () {
                    return (this._bitField & 16777216) !== 0;
                };

                var isPending = PromiseInspection.prototype.isPending = function () {
                    return (this._bitField & 50331648) === 0;
                };

                var isResolved = PromiseInspection.prototype.isResolved = function () {
                    return (this._bitField & 50331648) !== 0;
                };

                PromiseInspection.prototype.isCancelled =
                    Promise.prototype._isCancelled = function () {
                        return (this._bitField & 65536) === 65536;
                    };

                Promise.prototype.isCancelled = function () {
                    return this._target()._isCancelled();
                };

                Promise.prototype.isPending = function () {
                    return isPending.call(this._target());
                };

                Promise.prototype.isRejected = function () {
                    return isRejected.call(this._target());
                };

                Promise.prototype.isFulfilled = function () {
                    return isFulfilled.call(this._target());
                };

                Promise.prototype.isResolved = function () {
                    return isResolved.call(this._target());
                };

                Promise.prototype.value = function () {
                    return value.call(this._target());
                };

                Promise.prototype.reason = function () {
                    var target = this._target();
                    target._unsetRejectionIsUnhandled();
                    return reason.call(target);
                };

                Promise.prototype._value = function () {
                    return this._settledValue();
                };

                Promise.prototype._reason = function () {
                    this._unsetRejectionIsUnhandled();
                    return this._settledValue();
                };

                Promise.PromiseInspection = PromiseInspection;
            };

        }, {}],
        33: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL) {
                var util = _dereq_("./util");
                var errorObj = util.errorObj;
                var isObject = util.isObject;

                function tryConvertToPromise(obj, context) {
                    if (isObject(obj)) {
                        if (obj instanceof Promise) return obj;
                        var then = getThen(obj);
                        if (then === errorObj) {
                            if (context) context._pushContext();
                            var ret = Promise.reject(then.e);
                            if (context) context._popContext();
                            return ret;
                        } else if (typeof then === "function") {
                            if (isAnyBluebirdPromise(obj)) {
                                var ret = new Promise(INTERNAL);
                                obj._then(
                                    ret._fulfill,
                                    ret._reject,
                                    undefined,
                                    ret,
                                    null
                                );
                                return ret;
                            }
                            return doThenable(obj, then, context);
                        }
                    }
                    return obj;
                }

                function doGetThen(obj) {
                    return obj.then;
                }

                function getThen(obj) {
                    try {
                        return doGetThen(obj);
                    } catch (e) {
                        errorObj.e = e;
                        return errorObj;
                    }
                }

                var hasProp = {}.hasOwnProperty;

                function isAnyBluebirdPromise(obj) {
                    return hasProp.call(obj, "_promise0");
                }

                function doThenable(x, then, context) {
                    var promise = new Promise(INTERNAL);
                    var ret = promise;
                    if (context) context._pushContext();
                    promise._captureStackTrace();
                    if (context) context._popContext();
                    var synchronous = true;
                    var result = util.tryCatch(then).call(x, resolve, reject);
                    synchronous = false;

                    if (promise && result === errorObj) {
                        promise._rejectCallback(result.e, true);
                        promise = null;
                    }

                    function resolve(value) {
                        if (!promise) return;
                        if (x === value) {
                            promise._rejectCallback(
                                Promise._makeSelfResolutionError(), false, true);
                        } else {
                            promise._resolveCallback(value);
                        }
                        promise = null;
                    }

                    function reject(reason) {
                        if (!promise) return;
                        promise._rejectCallback(reason, synchronous);
                        promise = null;
                    }

                    return ret;
                }

                return tryConvertToPromise;
            };

        }, {"./util": 36}],
        34: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, INTERNAL) {
                var util = _dereq_("./util");
                var TimeoutError = Promise.TimeoutError;

                var afterTimeout = function (promise, message) {
                    if (!promise.isPending()) return;
                    if (typeof message !== "string") {
                        message = "operation timed out";
                    }
                    var err = new TimeoutError(message);
                    util.markAsOriginatingFromRejection(err);
                    promise._attachExtraTrace(err);
                    promise._reject(err);
                };

                var afterValue = function (value) { return delay(+this).thenReturn(value); };
                var delay = Promise.delay = function (ms, value) {
                    var ret;
                    if (value !== undefined) {
                        ret = Promise.resolve(value)
                            ._then(afterValue, null, null, ms, undefined);
                    } else {
                        ret = new Promise(INTERNAL);
                        setTimeout(function () { ret._fulfill(); }, +ms);
                    }
                    ret._setAsyncGuaranteed();
                    return ret;
                };

                Promise.prototype.delay = function (ms) {
                    return delay(ms, this);
                };

                function successClear(value) {
                    var handle = this;
                    if (handle instanceof Number) handle = +handle;
                    clearTimeout(handle);
                    return value;
                }

                function failureClear(reason) {
                    var handle = this;
                    if (handle instanceof Number) handle = +handle;
                    clearTimeout(handle);
                    throw reason;
                }

                Promise.prototype.timeout = function (ms, message) {
                    ms = +ms;
                    var ret = this.then();
                    var handle = setTimeout(function timeoutTimeout() {
                        afterTimeout(ret, message);
                    }, ms);
                    return ret._then(successClear, failureClear, undefined, handle, undefined);
                };

            };

        }, {"./util": 36}],
        35: [function (_dereq_, module, exports) {
            "use strict";
            module.exports = function (Promise, apiRejection, tryConvertToPromise,
                                       createContext, INTERNAL, debug) {
                var util = _dereq_("./util");
                var TypeError = _dereq_("./errors").TypeError;
                var inherits = _dereq_("./util").inherits;
                var errorObj = util.errorObj;
                var tryCatch = util.tryCatch;

                function thrower(e) {
                    setTimeout(function () {throw e;}, 0);
                }

                function castPreservingDisposable(thenable) {
                    var maybePromise = tryConvertToPromise(thenable);
                    if (maybePromise !== thenable &&
                        typeof thenable._isDisposable === "function" &&
                        typeof thenable._getDisposer === "function" &&
                        thenable._isDisposable()) {
                        maybePromise._setDisposable(thenable._getDisposer());
                    }
                    return maybePromise;
                }

                function dispose(resources, inspection) {
                    var i = 0;
                    var len = resources.length;
                    var ret = new Promise(INTERNAL);

                    function iterator() {
                        if (i >= len) return ret._fulfill();
                        var maybePromise = castPreservingDisposable(resources[i++]);
                        if (maybePromise instanceof Promise &&
                            maybePromise._isDisposable()) {
                            try {
                                maybePromise = tryConvertToPromise(
                                    maybePromise._getDisposer().tryDispose(inspection),
                                    resources.promise);
                            } catch (e) {
                                return thrower(e);
                            }
                            if (maybePromise instanceof Promise) {
                                return maybePromise._then(iterator, thrower,
                                    null, null, null);
                            }
                        }
                        iterator();
                    }

                    iterator();
                    return ret;
                }

                function Disposer(data, promise, context) {
                    this._data = data;
                    this._promise = promise;
                    this._context = context;
                }

                Disposer.prototype.data = function () {
                    return this._data;
                };

                Disposer.prototype.promise = function () {
                    return this._promise;
                };

                Disposer.prototype.resource = function () {
                    if (this.promise().isFulfilled()) {
                        return this.promise().value();
                    }
                    return null;
                };

                Disposer.prototype.tryDispose = function (inspection) {
                    var resource = this.resource();
                    var context = this._context;
                    if (context !== undefined) context._pushContext();
                    var ret = resource !== null
                        ? this.doDispose(resource, inspection) : null;
                    if (context !== undefined) context._popContext();
                    this._promise._unsetDisposable();
                    this._data = null;
                    return ret;
                };

                Disposer.isDisposer = function (d) {
                    return (d != null &&
                    typeof d.resource === "function" &&
                    typeof d.tryDispose === "function");
                };

                function FunctionDisposer(fn, promise, context) {
                    this.constructor$(fn, promise, context);
                }

                inherits(FunctionDisposer, Disposer);

                FunctionDisposer.prototype.doDispose = function (resource, inspection) {
                    var fn = this.data();
                    return fn.call(resource, resource, inspection);
                };

                function maybeUnwrapDisposer(value) {
                    if (Disposer.isDisposer(value)) {
                        this.resources[this.index]._setDisposable(value);
                        return value.promise();
                    }
                    return value;
                }

                Promise.using = function () {
                    var len = arguments.length;
                    if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
                    var fn = arguments[len - 1];
                    if (typeof fn !== "function") {
                        return apiRejection("expecting a function but got " + util.classString(fn));
                    }
                    len--;
                    var resources = new Array(len);
                    for (var i = 0; i < len; ++i) {
                        var resource = arguments[i];
                        if (Disposer.isDisposer(resource)) {
                            var disposer = resource;
                            resource = resource.promise();
                            resource._setDisposable(disposer);
                        } else {
                            var maybePromise = tryConvertToPromise(resource);
                            if (maybePromise instanceof Promise) {
                                resource =
                                    maybePromise._then(maybeUnwrapDisposer, null, null, {
                                        resources: resources,
                                        index: i
                                    }, undefined);
                            }
                        }
                        resources[i] = resource;
                    }

                    var reflectedResources = new Array(resources.length);
                    for (var i = 0; i < reflectedResources.length; ++i) {
                        reflectedResources[i] = Promise.resolve(resources[i]).reflect();
                    }

                    var resultPromise = Promise.all(reflectedResources)
                        .then(function (inspections) {
                            for (var i = 0; i < inspections.length; ++i) {
                                var inspection = inspections[i];
                                if (inspection.isRejected()) {
                                    errorObj.e = inspection.error();
                                    return errorObj;
                                }
                                inspections[i] = inspection.value();
                            }
                            promise._pushContext();
                            var ret = tryCatch(fn).apply(undefined, inspections);
                            var promisesCreated = promise._popContext();
                            debug.checkForgottenReturns(
                                ret, promisesCreated, "Promise.using", promise);
                            return ret;
                        });

                    var promise = resultPromise.lastly(function () {
                        var inspection = new Promise.PromiseInspection(resultPromise);
                        return dispose(resources, inspection);
                    });
                    resources.promise = promise;
                    return promise;
                };

                Promise.prototype._setDisposable = function (disposer) {
                    this._bitField = this._bitField | 131072;
                    this._disposer = disposer;
                };

                Promise.prototype._isDisposable = function () {
                    return (this._bitField & 131072) > 0;
                };

                Promise.prototype._getDisposer = function () {
                    return this._disposer;
                };

                Promise.prototype._unsetDisposable = function () {
                    this._bitField = this._bitField & (~131072);
                    this._disposer = undefined;
                };

                Promise.prototype.disposer = function (fn) {
                    if (typeof fn === "function") {
                        return new FunctionDisposer(fn, this, createContext());
                    }
                    throw new TypeError();
                };

            };

        }, {"./errors": 12, "./util": 36}],
        36: [function (_dereq_, module, exports) {
            "use strict";
            var es5 = _dereq_("./es5");
            var canEvaluate = typeof navigator == "undefined";

            var errorObj = {e: {}};
            var tryCatchTarget;

            function tryCatcher() {
                try {
                    return tryCatchTarget.apply(this, arguments);
                } catch (e) {
                    errorObj.e = e;
                    return errorObj;
                }
            }

            function tryCatch(fn) {
                tryCatchTarget = fn;
                return tryCatcher;
            }

            var inherits = function (Child, Parent) {
                var hasProp = {}.hasOwnProperty;

                function T() {
                    this.constructor = Child;
                    this.constructor$ = Parent;
                    for (var propertyName in Parent.prototype) {
                        if (hasProp.call(Parent.prototype, propertyName) &&
                            propertyName.charAt(propertyName.length - 1) !== "$"
                        ) {
                            this[propertyName + "$"] = Parent.prototype[propertyName];
                        }
                    }
                }

                T.prototype = Parent.prototype;
                Child.prototype = new T();
                return Child.prototype;
            };

            function isPrimitive(val) {
                return val == null || val === true || val === false ||
                    typeof val === "string" || typeof val === "number";

            }

            function isObject(value) {
                return typeof value === "function" ||
                    typeof value === "object" && value !== null;
            }

            function maybeWrapAsError(maybeError) {
                if (!isPrimitive(maybeError)) return maybeError;

                return new Error(safeToString(maybeError));
            }

            function withAppended(target, appendee) {
                var len = target.length;
                var ret = new Array(len + 1);
                var i;
                for (i = 0; i < len; ++i) {
                    ret[i] = target[i];
                }
                ret[i] = appendee;
                return ret;
            }

            function getDataPropertyOrDefault(obj, key, defaultValue) {
                if (es5.isES5) {
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null) {
                        return desc.get == null && desc.set == null
                            ? desc.value
                            : defaultValue;
                    }
                } else {
                    return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
                }
            }

            function notEnumerableProp(obj, name, value) {
                if (isPrimitive(obj)) return obj;
                var descriptor = {
                    value: value,
                    configurable: true,
                    enumerable: false,
                    writable: true
                };
                es5.defineProperty(obj, name, descriptor);
                return obj;
            }

            var wrapsPrimitiveReceiver = (function () {
                return this !== "string";
            }).call("string");

            function thrower(r) {
                throw r;
            }

            var inheritedDataKeys = (function () {
                if (es5.isES5) {
                    var oProto = Object.prototype;
                    var getKeys = Object.getOwnPropertyNames;
                    return function (obj) {
                        var ret = [];
                        var visitedKeys = Object.create(null);
                        while (obj != null && obj !== oProto) {
                            var keys;
                            try {
                                keys = getKeys(obj);
                            } catch (e) {
                                return ret;
                            }
                            for (var i = 0; i < keys.length; ++i) {
                                var key = keys[i];
                                if (visitedKeys[key]) continue;
                                visitedKeys[key] = true;
                                var desc = Object.getOwnPropertyDescriptor(obj, key);
                                if (desc != null && desc.get == null && desc.set == null) {
                                    ret.push(key);
                                }
                            }
                            obj = es5.getPrototypeOf(obj);
                        }
                        return ret;
                    };
                } else {
                    return function (obj) {
                        var ret = [];
                        /*jshint forin:false */
                        for (var key in obj) {
                            ret.push(key);
                        }
                        return ret;
                    };
                }

            })();

            function isClass(fn) {
                try {
                    if (typeof fn === "function") {
                        var keys = es5.names(fn.prototype);
                        if (es5.isES5) return keys.length > 1;
                        return keys.length > 0 && !(keys.length === 1 && keys[0] === "constructor");
                    }
                    return false;
                } catch (e) {
                    return false;
                }
            }

            function toFastProperties(obj) {
                /*jshint -W027,-W031*/
                function FakeConstructor() {}

                FakeConstructor.prototype = obj;
                new FakeConstructor();
                return obj;
                eval(obj);
            }

            var rident = /^[a-z$_][a-z$_0-9]*$/i;

            function isIdentifier(str) {
                return rident.test(str);
            }

            function filledRange(count, prefix, suffix) {
                var ret = new Array(count);
                for (var i = 0; i < count; ++i) {
                    ret[i] = prefix + i + suffix;
                }
                return ret;
            }

            function safeToString(obj) {
                try {
                    return obj + "";
                } catch (e) {
                    return "[no string representation]";
                }
            }

            function markAsOriginatingFromRejection(e) {
                try {
                    notEnumerableProp(e, "isOperational", true);
                }
                catch (ignore) {}
            }

            function originatesFromRejection(e) {
                if (e == null) return false;
                return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
                e["isOperational"] === true);
            }

            function canAttachTrace(obj) {
                return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
            }

            var ensureErrorObject = (function () {
                if (!("stack" in new Error())) {
                    return function (value) {
                        if (canAttachTrace(value)) return value;
                        try {throw new Error(safeToString(value));}
                        catch (err) {return err;}
                    };
                } else {
                    return function (value) {
                        if (canAttachTrace(value)) return value;
                        return new Error(safeToString(value));
                    };
                }
            })();

            function classString(obj) {
                return {}.toString.call(obj);
            }

            function copyDescriptors(from, to, filter) {
                var keys = es5.names(from);
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (filter(key)) {
                        es5.defineProperty(to, key, es5.getDescriptor(from, key));
                    }
                }
            }

            var isNode = typeof process !== "undefined" &&
                classString(process).toLowerCase() === "[object process]";

            function env(key, def) {
                return isNode ? process.env[key] : def;
            }

            var ret = {
                isClass: isClass,
                isIdentifier: isIdentifier,
                inheritedDataKeys: inheritedDataKeys,
                getDataPropertyOrDefault: getDataPropertyOrDefault,
                thrower: thrower,
                isArray: es5.isArray,
                notEnumerableProp: notEnumerableProp,
                isPrimitive: isPrimitive,
                isObject: isObject,
                canEvaluate: canEvaluate,
                errorObj: errorObj,
                tryCatch: tryCatch,
                inherits: inherits,
                withAppended: withAppended,
                maybeWrapAsError: maybeWrapAsError,
                wrapsPrimitiveReceiver: wrapsPrimitiveReceiver,
                toFastProperties: toFastProperties,
                filledRange: filledRange,
                toString: safeToString,
                canAttachTrace: canAttachTrace,
                ensureErrorObject: ensureErrorObject,
                originatesFromRejection: originatesFromRejection,
                markAsOriginatingFromRejection: markAsOriginatingFromRejection,
                classString: classString,
                copyDescriptors: copyDescriptors,
                isNode: isNode,
                env: env
            };
            try {throw new Error(); } catch (e) {ret.lastLineError = e;}
            module.exports = ret;

        }, {"./es5": 13}]
    }, {}, [4])(4)
});
;
if (typeof window !== 'undefined' && window !== null) { window.P = window.Promise; } else if (typeof self !== 'undefined' && self !== null) { self.P = self.Promise; }
