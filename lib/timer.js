/**
 * This timer keeps track of all used timers inside this plugin and can
 * clear, start or change the timeout of these timers at any time.
 */
(function() {
    'use strict';

    var registeredTimers = {};

    window.timer = {
        getRegisteredTimer: function(timerId) {
            if(registeredTimers.hasOwnProperty(timerId)) {
                return registeredTimers[timerId];
            }

            console.warn('no such timer: ' + timerId);
            return null;
        },
        update: function(timerId) {
            if(timerId) {
                timer.startTimer(timerId);
            } else {
                for(timerId in registeredTimers) {
                    timer.startTimer(timerId);
                }
            }
        },
        registerTimer: function(timerId, timerFunction) {
            registeredTimers[timerId] = {
                function: timerFunction,
                interval: null,  // interval in miliseconds
                timeout: null,  // timeout in miliseconds
                reset: false,
                timer : {  // references to timer objects to be able to clear it later
                    interval: null,
                    timeout: null,
                }
            };
        },
        unregisterTimer: function(timerId) {
            if(timer.getRegisteredTimer(timerId)) {
                delete registeredTimers[timerId];
            }
        },
        setInterval: function(timerId, interval) {
            if(timer.getRegisteredTimer(timerId)) {
                registeredTimers[timerId]['interval'] = interval;
            }
        },
        setTimeout: function(timerId, timeout, reset) {
            if(timer.getRegisteredTimer(timerId)) {
                registeredTimers[timerId]['timeout'] = timeout;

                // *reset* indicates whether to re-run *timerFunction* after
                // *timeout* miliseconds it finished
                registeredTimers[timerId]['reset'] = reset;
            }
        },
        startTimer: function(timerId) {
            if(timer.getRegisteredTimer(timerId)) {
                var timerFunction = registeredTimers[timerId]['function'];
                if(registeredTimers[timerId]['interval']) {
                    registeredTimers[timerId]['timer']['interval'] = setInterval(timerFunction, registeredTimers[timerId]['interval']);
                }

                var timeout = registeredTimers[timerId]['timeout'];
                if(typeof timeout === 'function') {
                    timeout = timeout();
                }
                if(timeout) {
                    if(registeredTimers[timerId]['reset']) {
                        var resetFunction = function() {
                            timerFunction();

                            // call again once finished
                            var timeout = registeredTimers[timerId]['timeout'];
                            if(typeof timeout === 'function') {
                                timeout = timeout();
                            }
                            if(timeout) {
                                timer.stopTimer(timerId);
                                registeredTimers[timerId]['timer']['timeout'] = setTimeout(resetFunction, timeout);
                            }
                        };
                        timer.stopTimer(timerId);
                        registeredTimers[timerId]['timer']['timeout'] = setTimeout(resetFunction, timeout);
                    } else {
                        timer.stopTimer(timerId);
                        registeredTimers[timerId]['timer']['timeout'] = setTimeout(timerFunction, timeout);
                    }
                }
            }
        },
        stopTimer: function(timerId) {
            if(timer.getRegisteredTimer(timerId)) {
                if(registeredTimers[timerId]['timer']['interval']) {
                    clearInterval(registeredTimers[timerId]['timer']['interval']);
                    registeredTimers[timerId]['timer']['interval'] = null;
                }
                if(registeredTimers[timerId]['timer']['timeout']) {
                    clearTimeout(registeredTimers[timerId]['timer']['timeout']);
                    registeredTimers[timerId]['timer']['timeout'] = null;
                }
            }
        },
        /**
         * Generate a jitter percentage from a timeout.
         * @param {Number} timeout - The timeout to calculate jitter from.
         * @param {Number} percentage - The jitter percentage from timeout.
         * @returns {Number} The calculated jitter.
         */
        jitter: function(timeout, percentage) {
            let min = 0 - Math.ceil(timeout * (percentage / 100));
            let max = Math.floor(timeout * (percentage / 100));
            return Math.floor(Math.random() * (max - min)) + min;
        },
        /**
         * This doubles the retry timeout in each run and adds
         * additional jitter. This is useful for exponential backoff
         * when scheduling a reconnect event.
         * @param {object} timeout - The reference retry dobject.
         * @returns {object} The updated retry object.
         */
        retryTimeout: function(retry) {
            if (!retry) {
                retry = {current: 2500, limit: 9000000};
            }
            // Make sure that current doesn't go past the limit.
            if (retry.current * 2 < retry.limit) {
                retry.current = retry.current * 2;
            } else {
                retry.current = retry.limit;
            }
            retry.jittered = retry.current + this.jitter(retry.current, 30);
            return retry;
        },
    };
})();
