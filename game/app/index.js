/*!
 *  howler.js v1.1.25
 *  howlerjs.com
 *
 *  (c) 2013-2014, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {
  // setup
  var cache = {};

  // setup the audio context
  var ctx = null,
    usingWebAudio = true,
    noAudio = false;
  try {
    if (typeof AudioContext !== 'undefined') {
      ctx = new AudioContext();
    } else if (typeof webkitAudioContext !== 'undefined') {
      ctx = new webkitAudioContext();
    } else {
      usingWebAudio = false;
    }
  } catch(e) {
    usingWebAudio = false;
  }

  if (!usingWebAudio) {
    if (typeof Audio !== 'undefined') {
      try {
        new Audio();
      } catch(e) {
        noAudio = true;
      }
    } else {
      noAudio = true;
    }
  }

  // create a master gain node
  if (usingWebAudio) {
    var masterGain = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }

  // create global controller
  var HowlerGlobal = function(codecs) {
    this._volume = 1;
    this._muted = false;
    this.usingWebAudio = usingWebAudio;
    this.ctx = ctx;
    this.noAudio = noAudio;
    this._howls = [];
    this._codecs = codecs;
    this.iOSAutoEnable = true;
  };
  HowlerGlobal.prototype = {
    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Howler/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this;

      // make sure volume is a number
      vol = parseFloat(vol);

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (usingWebAudio) {
          masterGain.gain.value = vol;
        }

        // loop through cache and change volume of all nodes that are using HTML5 Audio
        for (var key in self._howls) {
          if (self._howls.hasOwnProperty(key) && self._howls[key]._webAudio === false) {
            // loop through the audio nodes
            for (var i=0; i<self._howls[key]._audioNode.length; i++) {
              self._howls[key]._audioNode[i].volume = self._howls[key]._volume * self._volume;
            }
          }
        }

        return self;
      }

      // return the current global volume
      return (usingWebAudio) ? masterGain.gain.value : self._volume;
    },

    /**
     * Mute all sounds.
     * @return {Howler}
     */
    mute: function() {
      this._setMuted(true);

      return this;
    },

    /**
     * Unmute all sounds.
     * @return {Howler}
     */
    unmute: function() {
      this._setMuted(false);

      return this;
    },

    /**
     * Handle muting and unmuting globally.
     * @param  {Boolean} muted Is muted or not.
     */
    _setMuted: function(muted) {
      var self = this;

      self._muted = muted;

      if (usingWebAudio) {
        masterGain.gain.value = muted ? 0 : self._volume;
      }

      for (var key in self._howls) {
        if (self._howls.hasOwnProperty(key) && self._howls[key]._webAudio === false) {
          // loop through the audio nodes
          for (var i=0; i<self._howls[key]._audioNode.length; i++) {
            self._howls[key]._audioNode[i].muted = muted;
          }
        }
      }
    },

    /**
     * Check for codec support.
     * @param  {String} ext Audio file extention.
     * @return {Boolean}
     */
    codecs: function(ext) {
      return this._codecs[ext];
    },

    /**
     * iOS will only allow audio to be played after a user interaction.
     * Attempt to automatically unlock audio on the first user interaction.
     * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
     * @return {Howler}
     */
    _enableiOSAudio: function() {
      var self = this;

      // only run this on iOS if audio isn't already eanbled
      if (ctx && (self._iOSEnabled || !/iPhone|iPad|iPod/i.test(navigator.userAgent))) {
        return;
      }

      self._iOSEnabled = false;

      // call this method on touch start to create and play a buffer,
      // then check if the audio actually played to determine if
      // audio has now been unlocked on iOS
      var unlock = function() {
        // create an empty buffer
        var buffer = ctx.createBuffer(1, 1, 22050);
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // play the empty buffer
        if (typeof source.start === 'undefined') {
          source.noteOn(0);
        } else {
          source.start(0);
        }

        // setup a timeout to check that we are unlocked on the next event loop
        setTimeout(function() {
          if ((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
            // update the unlocked state and prevent this check from happening again
            self._iOSEnabled = true;
            self.iOSAutoEnable = false;

            // remove the touch start listener
            window.removeEventListener('touchstart', unlock, false);
          }
        }, 0);
      };

      // setup a touch start listener to attempt an unlock in
      window.addEventListener('touchstart', unlock, false);

      return self;
    }
  };

  // check for browser codec support
  var audioTest = null;
  var codecs = {};
  if (!noAudio) {
    audioTest = new Audio();
    codecs = {
      mp3: !!audioTest.canPlayType('audio/mpeg;').replace(/^no$/, ''),
      opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
      ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
      wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
      aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
      m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')
    };
  }

  // allow access to the global audio controls
  var Howler = new HowlerGlobal(codecs);

  // setup the audio object
  var Howl = function(o) {
    var self = this;

    // setup the defaults
    self._autoplay = o.autoplay || false;
    self._buffer = o.buffer || false;
    self._duration = o.duration || 0;
    self._format = o.format || null;
    self._loop = o.loop || false;
    self._loaded = false;
    self._sprite = o.sprite || {};
    self._src = o.src || '';
    self._pos3d = o.pos3d || [0, 0, -0.5];
    self._volume = o.volume !== undefined ? o.volume : 1;
    self._urls = o.urls || [];
    self._rate = o.rate || 1;

    // allow forcing of a specific panningModel ('equalpower' or 'HRTF'),
    // if none is specified, defaults to 'equalpower' and switches to 'HRTF'
    // if 3d sound is used
    self._model = o.model || null;

    // setup event functions
    self._onload = [o.onload || function() {}];
    self._onloaderror = [o.onloaderror || function() {}];
    self._onend = [o.onend || function() {}];
    self._onpause = [o.onpause || function() {}];
    self._onplay = [o.onplay || function() {}];

    self._onendTimer = [];

    // Web Audio or HTML5 Audio?
    self._webAudio = usingWebAudio && !self._buffer;

    // check if we need to fall back to HTML5 Audio
    self._audioNode = [];
    if (self._webAudio) {
      self._setupAudioNode();
    }

    // automatically try to enable audio on iOS
    if (typeof ctx !== 'undefined' && ctx && Howler.iOSAutoEnable) {
      Howler._enableiOSAudio();
    }

    // add this to an array of Howl's to allow global control
    Howler._howls.push(self);

    // load the track
    self.load();
  };

  // setup all of the methods
  Howl.prototype = {
    /**
     * Load an audio file.
     * @return {Howl}
     */
    load: function() {
      var self = this,
        url = null;

      // if no audio is available, quit immediately
      if (noAudio) {
        self.on('loaderror');
        return;
      }

      // loop through source URLs and pick the first one that is compatible
      for (var i=0; i<self._urls.length; i++) {
        var ext, urlItem;

        if (self._format) {
          // use specified audio format if available
          ext = self._format;
        } else {
          // figure out the filetype (whether an extension or base64 data)
          urlItem = self._urls[i];
          ext = /^data:audio\/([^;,]+);/i.exec(urlItem);
          if (!ext) {
            ext = /\.([^.]+)$/.exec(urlItem.split('?', 1)[0]);
          }

          if (ext) {
            ext = ext[1].toLowerCase();
          } else {
            self.on('loaderror');
            return;
          }
        }

        if (codecs[ext]) {
          url = self._urls[i];
          break;
        }
      }

      if (!url) {
        self.on('loaderror');
        return;
      }

      self._src = url;

      if (self._webAudio) {
        loadBuffer(self, url);
      } else {
        var newNode = new Audio();

        // listen for errors with HTML5 audio (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror)
        newNode.addEventListener('error', function () {
          if (newNode.error && newNode.error.code === 4) {
            HowlerGlobal.noAudio = true;
          }

          self.on('loaderror', {type: newNode.error ? newNode.error.code : 0});
        }, false);

        self._audioNode.push(newNode);

        // setup the new audio node
        newNode.src = url;
        newNode._pos = 0;
        newNode.preload = 'auto';
        newNode.volume = (Howler._muted) ? 0 : self._volume * Howler.volume();

        // setup the event listener to start playing the sound
        // as soon as it has buffered enough
        var listener = function() {
          // round up the duration when using HTML5 Audio to account for the lower precision
          self._duration = Math.ceil(newNode.duration * 10) / 10;

          // setup a sprite if none is defined
          if (Object.getOwnPropertyNames(self._sprite).length === 0) {
            self._sprite = {_default: [0, self._duration * 1000]};
          }

          if (!self._loaded) {
            self._loaded = true;
            self.on('load');
          }

          if (self._autoplay) {
            self.play();
          }

          // clear the event listener
          newNode.removeEventListener('canplaythrough', listener, false);
        };
        newNode.addEventListener('canplaythrough', listener, false);
        newNode.load();
      }

      return self;
    },

    /**
     * Get/set the URLs to be pulled from to play in this source.
     * @param  {Array} urls  Arry of URLs to load from
     * @return {Howl}        Returns self or the current URLs
     */
    urls: function(urls) {
      var self = this;

      if (urls) {
        self.stop();
        self._urls = (typeof urls === 'string') ? [urls] : urls;
        self._loaded = false;
        self.load();

        return self;
      } else {
        return self._urls;
      }
    },

    /**
     * Play a sound from the current time (0 by default).
     * @param  {String}   sprite   (optional) Plays from the specified position in the sound sprite definition.
     * @param  {Function} callback (optional) Returns the unique playback id for this sound instance.
     * @return {Howl}
     */
    play: function(sprite, callback) {
      var self = this;

      // if no sprite was passed but a callback was, update the variables
      if (typeof sprite === 'function') {
        callback = sprite;
      }

      // use the default sprite if none is passed
      if (!sprite || typeof sprite === 'function') {
        sprite = '_default';
      }

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.play(sprite, callback);
        });

        return self;
      }

      // if the sprite doesn't exist, play nothing
      if (!self._sprite[sprite]) {
        if (typeof callback === 'function') callback();
        return self;
      }

      // get the node to playback
      self._inactiveNode(function(node) {
        // persist the sprite being played
        node._sprite = sprite;

        // determine where to start playing from
        var pos = (node._pos > 0) ? node._pos : self._sprite[sprite][0] / 1000;

        // determine how long to play for
        var duration = 0;
        if (self._webAudio) {
          duration = self._sprite[sprite][1] / 1000 - node._pos;
          if (node._pos > 0) {
            pos = self._sprite[sprite][0] / 1000 + pos;
          }
        } else {
          duration = self._sprite[sprite][1] / 1000 - (pos - self._sprite[sprite][0] / 1000);
        }

        // determine if this sound should be looped
        var loop = !!(self._loop || self._sprite[sprite][2]);

        // set timer to fire the 'onend' event
        var soundId = (typeof callback === 'string') ? callback : Math.round(Date.now() * Math.random()) + '',
          timerId;
        (function() {
          var data = {
            id: soundId,
            sprite: sprite,
            loop: loop
          };
          timerId = setTimeout(function() {
            // if looping, restart the track
            if (!self._webAudio && loop) {
              self.stop(data.id).play(sprite, data.id);
            }

            // set web audio node to paused at end
            if (self._webAudio && !loop) {
              self._nodeById(data.id).paused = true;
              self._nodeById(data.id)._pos = 0;

              // clear the end timer
              self._clearEndTimer(data.id);
            }

            // end the track if it is HTML audio and a sprite
            if (!self._webAudio && !loop) {
              self.stop(data.id);
            }

            // fire ended event
            self.on('end', soundId);
          }, duration * 1000);

          // store the reference to the timer
          self._onendTimer.push({timer: timerId, id: data.id});
        })();

        if (self._webAudio) {
          var loopStart = self._sprite[sprite][0] / 1000,
            loopEnd = self._sprite[sprite][1] / 1000;

          // set the play id to this node and load into context
          node.id = soundId;
          node.paused = false;
          refreshBuffer(self, [loop, loopStart, loopEnd], soundId);
          self._playStart = ctx.currentTime;
          node.gain.value = self._volume;

          if (typeof node.bufferSource.start === 'undefined') {
            node.bufferSource.noteGrainOn(0, pos, duration);
          } else {
            node.bufferSource.start(0, pos, duration);
          }
        } else {
          if (node.readyState === 4 || !node.readyState && navigator.isCocoonJS) {
            node.readyState = 4;
            node.id = soundId;
            node.currentTime = pos;
            node.muted = Howler._muted || node.muted;
            node.volume = self._volume * Howler.volume();
            setTimeout(function() { node.play(); }, 0);
          } else {
            self._clearEndTimer(soundId);

            (function(){
              var sound = self,
                playSprite = sprite,
                fn = callback,
                newNode = node;
              var listener = function() {
                sound.play(playSprite, fn);

                // clear the event listener
                newNode.removeEventListener('canplaythrough', listener, false);
              };
              newNode.addEventListener('canplaythrough', listener, false);
            })();

            return self;
          }
        }

        // fire the play event and send the soundId back in the callback
        self.on('play');
        if (typeof callback === 'function') callback(soundId);

        return self;
      });

      return self;
    },

    /**
     * Pause playback and save the current position.
     * @param {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    pause: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.pause(id);
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(id);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        activeNode._pos = self.pos(null, id);

        if (self._webAudio) {
          // make sure the sound has been created
          if (!activeNode.bufferSource || activeNode.paused) {
            return self;
          }

          activeNode.paused = true;
          if (typeof activeNode.bufferSource.stop === 'undefined') {
            activeNode.bufferSource.noteOff(0);
          } else {
            activeNode.bufferSource.stop(0);
          }
        } else {
          activeNode.pause();
        }
      }

      self.on('pause');

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl}
     */
    stop: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.stop(id);
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(id);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        activeNode._pos = 0;

        if (self._webAudio) {
          // make sure the sound has been created
          if (!activeNode.bufferSource || activeNode.paused) {
            return self;
          }

          activeNode.paused = true;

          if (typeof activeNode.bufferSource.stop === 'undefined') {
            activeNode.bufferSource.noteOff(0);
          } else {
            activeNode.bufferSource.stop(0);
          }
        } else if (!isNaN(activeNode.duration)) {
          activeNode.pause();
          activeNode.currentTime = 0;
        }
      }

      return self;
    },

    /**
     * Mute this sound.
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    mute: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.mute(id);
        });

        return self;
      }

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (self._webAudio) {
          activeNode.gain.value = 0;
        } else {
          activeNode.muted = true;
        }
      }

      return self;
    },

    /**
     * Unmute this sound.
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    unmute: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.unmute(id);
        });

        return self;
      }

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (self._webAudio) {
          activeNode.gain.value = self._volume;
        } else {
          activeNode.muted = false;
        }
      }

      return self;
    },

    /**
     * Get/set volume of this sound.
     * @param  {Float}  vol Volume from 0.0 to 1.0.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl/Float}     Returns self or current volume.
     */
    volume: function(vol, id) {
      var self = this;

      // make sure volume is a number
      vol = parseFloat(vol);

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        // if the sound hasn't been loaded, add it to the event queue
        if (!self._loaded) {
          self.on('play', function() {
            self.volume(vol, id);
          });

          return self;
        }

        var activeNode = (id) ? self._nodeById(id) : self._activeNode();
        if (activeNode) {
          if (self._webAudio) {
            activeNode.gain.value = vol;
          } else {
            activeNode.volume = vol * Howler.volume();
          }
        }

        return self;
      } else {
        return self._volume;
      }
    },

    /**
     * Get/set whether to loop the sound.
     * @param  {Boolean} loop To loop or not to loop, that is the question.
     * @return {Howl/Boolean}      Returns self or current looping value.
     */
    loop: function(loop) {
      var self = this;

      if (typeof loop === 'boolean') {
        self._loop = loop;

        return self;
      } else {
        return self._loop;
      }
    },

    /**
     * Get/set sound sprite definition.
     * @param  {Object} sprite Example: {spriteName: [offset, duration, loop]}
     *                @param {Integer} offset   Where to begin playback in milliseconds
     *                @param {Integer} duration How long to play in milliseconds
     *                @param {Boolean} loop     (optional) Set true to loop this sprite
     * @return {Howl}        Returns current sprite sheet or self.
     */
    sprite: function(sprite) {
      var self = this;

      if (typeof sprite === 'object') {
        self._sprite = sprite;

        return self;
      } else {
        return self._sprite;
      }
    },

    /**
     * Get/set the position of playback.
     * @param  {Float}  pos The position to move current playback to.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl/Float}      Returns self or current playback position.
     */
    pos: function(pos, id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.pos(pos);
        });

        return typeof pos === 'number' ? self : self._pos || 0;
      }

      // make sure we are dealing with a number for pos
      pos = parseFloat(pos);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (pos >= 0) {
          self.pause(id);
          activeNode._pos = pos;
          self.play(activeNode._sprite, id);

          return self;
        } else {
          return self._webAudio ? activeNode._pos + (ctx.currentTime - self._playStart) : activeNode.currentTime;
        }
      } else if (pos >= 0) {
        return self;
      } else {
        // find the first inactive node to return the pos for
        for (var i=0; i<self._audioNode.length; i++) {
          if (self._audioNode[i].paused && self._audioNode[i].readyState === 4) {
            return (self._webAudio) ? self._audioNode[i]._pos : self._audioNode[i].currentTime;
          }
        }
      }
    },

    /**
     * Get/set the 3D position of the audio source.
     * The most common usage is to set the 'x' position
     * to affect the left/right ear panning. Setting any value higher than
     * 1.0 will begin to decrease the volume of the sound as it moves further away.
     * NOTE: This only works with Web Audio API, HTML5 Audio playback
     * will not be affected.
     * @param  {Float}  x  The x-position of the playback from -1000.0 to 1000.0
     * @param  {Float}  y  The y-position of the playback from -1000.0 to 1000.0
     * @param  {Float}  z  The z-position of the playback from -1000.0 to 1000.0
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl/Array}   Returns self or the current 3D position: [x, y, z]
     */
    pos3d: function(x, y, z, id) {
      var self = this;

      // set a default for the optional 'y' & 'z'
      y = (typeof y === 'undefined' || !y) ? 0 : y;
      z = (typeof z === 'undefined' || !z) ? -0.5 : z;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.pos3d(x, y, z, id);
        });

        return self;
      }

      if (x >= 0 || x < 0) {
        if (self._webAudio) {
          var activeNode = (id) ? self._nodeById(id) : self._activeNode();
          if (activeNode) {
            self._pos3d = [x, y, z];
            activeNode.panner.setPosition(x, y, z);
            activeNode.panner.panningModel = self._model || 'HRTF';
          }
        }
      } else {
        return self._pos3d;
      }

      return self;
    },

    /**
     * Fade a currently playing sound between two volumes.
     * @param  {Number}   from     The volume to fade from (0.0 to 1.0).
     * @param  {Number}   to       The volume to fade to (0.0 to 1.0).
     * @param  {Number}   len      Time in milliseconds to fade.
     * @param  {Function} callback (optional) Fired when the fade is complete.
     * @param  {String}   id       (optional) The play instance ID.
     * @return {Howl}
     */
    fade: function(from, to, len, callback, id) {
      var self = this,
        diff = Math.abs(from - to),
        dir = from > to ? 'down' : 'up',
        steps = diff / 0.01,
        stepTime = len / steps;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.fade(from, to, len, callback, id);
        });

        return self;
      }

      // set the volume to the start position
      self.volume(from, id);

      for (var i=1; i<=steps; i++) {
        (function() {
          var change = self._volume + (dir === 'up' ? 0.01 : -0.01) * i,
            vol = Math.round(1000 * change) / 1000,
            toVol = to;

          setTimeout(function() {
            self.volume(vol, id);

            if (vol === toVol) {
              if (callback) callback();
            }
          }, stepTime * i);
        })();
      }
    },

    /**
     * [DEPRECATED] Fade in the current sound.
     * @param  {Float}    to      Volume to fade to (0.0 to 1.0).
     * @param  {Number}   len     Time in milliseconds to fade.
     * @param  {Function} callback
     * @return {Howl}
     */
    fadeIn: function(to, len, callback) {
      return this.volume(0).play().fade(0, to, len, callback);
    },

    /**
     * [DEPRECATED] Fade out the current sound and pause when finished.
     * @param  {Float}    to       Volume to fade to (0.0 to 1.0).
     * @param  {Number}   len      Time in milliseconds to fade.
     * @param  {Function} callback
     * @param  {String}   id       (optional) The play instance ID.
     * @return {Howl}
     */
    fadeOut: function(to, len, callback, id) {
      var self = this;

      return self.fade(self._volume, to, len, function() {
        if (callback) callback();
        self.pause(id);

        // fire ended event
        self.on('end');
      }, id);
    },

    /**
     * Get an audio node by ID.
     * @return {Howl} Audio node.
     */
    _nodeById: function(id) {
      var self = this,
        node = self._audioNode[0];

      // find the node with this ID
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].id === id) {
          node = self._audioNode[i];
          break;
        }
      }

      return node;
    },

    /**
     * Get the first active audio node.
     * @return {Howl} Audio node.
     */
    _activeNode: function() {
      var self = this,
        node = null;

      // find the first playing node
      for (var i=0; i<self._audioNode.length; i++) {
        if (!self._audioNode[i].paused) {
          node = self._audioNode[i];
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      return node;
    },

    /**
     * Get the first inactive audio node.
     * If there is none, create a new one and add it to the pool.
     * @param  {Function} callback Function to call when the audio node is ready.
     */
    _inactiveNode: function(callback) {
      var self = this,
        node = null;

      // find first inactive node to recycle
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused && self._audioNode[i].readyState === 4) {
          // send the node back for use by the new play instance
          callback(self._audioNode[i]);
          node = true;
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      if (node) {
        return;
      }

      // create new node if there are no inactives
      var newNode;
      if (self._webAudio) {
        newNode = self._setupAudioNode();
        callback(newNode);
      } else {
        self.load();
        newNode = self._audioNode[self._audioNode.length - 1];

        // listen for the correct load event and fire the callback
        var listenerEvent = navigator.isCocoonJS ? 'canplaythrough' : 'loadedmetadata';
        var listener = function() {
          newNode.removeEventListener(listenerEvent, listener, false);
          callback(newNode);
        };
        newNode.addEventListener(listenerEvent, listener, false);
      }
    },

    /**
     * If there are more than 5 inactive audio nodes in the pool, clear out the rest.
     */
    _drainPool: function() {
      var self = this,
        inactive = 0,
        i;

      // count the number of inactive nodes
      for (i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused) {
          inactive++;
        }
      }

      // remove excess inactive nodes
      for (i=self._audioNode.length-1; i>=0; i--) {
        if (inactive <= 5) {
          break;
        }

        if (self._audioNode[i].paused) {
          // disconnect the audio source if using Web Audio
          if (self._webAudio) {
            self._audioNode[i].disconnect(0);
          }

          inactive--;
          self._audioNode.splice(i, 1);
        }
      }
    },

    /**
     * Clear 'onend' timeout before it ends.
     * @param  {String} soundId  The play instance ID.
     */
    _clearEndTimer: function(soundId) {
      var self = this,
        index = 0;

      // loop through the timers to find the one associated with this sound
      for (var i=0; i<self._onendTimer.length; i++) {
        if (self._onendTimer[i].id === soundId) {
          index = i;
          break;
        }
      }

      var timer = self._onendTimer[index];
      if (timer) {
        clearTimeout(timer.timer);
        self._onendTimer.splice(index, 1);
      }
    },

    /**
     * Setup the gain node and panner for a Web Audio instance.
     * @return {Object} The new audio node.
     */
    _setupAudioNode: function() {
      var self = this,
        node = self._audioNode,
        index = self._audioNode.length;

      // create gain node
      node[index] = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
      node[index].gain.value = self._volume;
      node[index].paused = true;
      node[index]._pos = 0;
      node[index].readyState = 4;
      node[index].connect(masterGain);

      // create the panner
      node[index].panner = ctx.createPanner();
      node[index].panner.panningModel = self._model || 'equalpower';
      node[index].panner.setPosition(self._pos3d[0], self._pos3d[1], self._pos3d[2]);
      node[index].panner.connect(node[index]);

      return node[index];
    },

    /**
     * Call/set custom events.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Function to call.
     * @return {Howl}
     */
    on: function(event, fn) {
      var self = this,
        events = self['_on' + event];

      if (typeof fn === 'function') {
        events.push(fn);
      } else {
        for (var i=0; i<events.length; i++) {
          if (fn) {
            events[i].call(self, fn);
          } else {
            events[i].call(self);
          }
        }
      }

      return self;
    },

    /**
     * Remove a custom event.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Listener to remove.
     * @return {Howl}
     */
    off: function(event, fn) {
      var self = this,
        events = self['_on' + event],
        fnString = fn ? fn.toString() : null;

      if (fnString) {
        // loop through functions in the event for comparison
        for (var i=0; i<events.length; i++) {
          if (fnString === events[i].toString()) {
            events.splice(i, 1);
            break;
          }
        }
      } else {
        self['_on' + event] = [];
      }

      return self;
    },

    /**
     * Unload and destroy the current Howl object.
     * This will immediately stop all play instances attached to this sound.
     */
    unload: function() {
      var self = this;

      // stop playing any active nodes
      var nodes = self._audioNode;
      for (var i=0; i<self._audioNode.length; i++) {
        // stop the sound if it is currently playing
        if (!nodes[i].paused) {
          self.stop(nodes[i].id);
          self.on('end', nodes[i].id);
        }

        if (!self._webAudio) {
          // remove the source if using HTML5 Audio
          nodes[i].src = '';
        } else {
          // disconnect the output from the master gain
          nodes[i].disconnect(0);
        }
      }

      // make sure all timeouts are cleared
      for (i=0; i<self._onendTimer.length; i++) {
        clearTimeout(self._onendTimer[i].timer);
      }

      // remove the reference in the global Howler object
      var index = Howler._howls.indexOf(self);
      if (index !== null && index >= 0) {
        Howler._howls.splice(index, 1);
      }

      // delete this sound from the cache
      delete cache[self._src];
      self = null;
    }

  };

  // only define these functions when using WebAudio
  if (usingWebAudio) {

    /**
     * Buffer a sound from URL (or from cache) and decode to audio source (Web Audio API).
     * @param  {Object} obj The Howl object for the sound to load.
     * @param  {String} url The path to the sound file.
     */
    var loadBuffer = function(obj, url) {
      // check if the buffer has already been cached
      if (url in cache) {
        // set the duration from the cache
        obj._duration = cache[url].duration;

        // load the sound into this object
        loadSound(obj);
        return;
      }
      
      if (/^data:[^;]+;base64,/.test(url)) {
        // Decode base64 data-URIs because some browsers cannot load data-URIs with XMLHttpRequest.
        var data = atob(url.split(',')[1]);
        var dataView = new Uint8Array(data.length);
        for (var i=0; i<data.length; ++i) {
          dataView[i] = data.charCodeAt(i);
        }
        
        decodeAudioData(dataView.buffer, obj, url);
      } else {
        // load the buffer from the URL
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          decodeAudioData(xhr.response, obj, url);
        };
        xhr.onerror = function() {
          // if there is an error, switch the sound to HTML Audio
          if (obj._webAudio) {
            obj._buffer = true;
            obj._webAudio = false;
            obj._audioNode = [];
            delete obj._gainNode;
            delete cache[url];
            obj.load();
          }
        };
        try {
          xhr.send();
        } catch (e) {
          xhr.onerror();
        }
      }
    };

    /**
     * Decode audio data from an array buffer.
     * @param  {ArrayBuffer} arraybuffer The audio data.
     * @param  {Object} obj The Howl object for the sound to load.
     * @param  {String} url The path to the sound file.
     */
    var decodeAudioData = function(arraybuffer, obj, url) {
      // decode the buffer into an audio source
      ctx.decodeAudioData(
        arraybuffer,
        function(buffer) {
          if (buffer) {
            cache[url] = buffer;
            loadSound(obj, buffer);
          }
        },
        function(err) {
          obj.on('loaderror');
        }
      );
    };

    /**
     * Finishes loading the Web Audio API sound and fires the loaded event
     * @param  {Object}  obj    The Howl object for the sound to load.
     * @param  {Objecct} buffer The decoded buffer sound source.
     */
    var loadSound = function(obj, buffer) {
      // set the duration
      obj._duration = (buffer) ? buffer.duration : obj._duration;

      // setup a sprite if none is defined
      if (Object.getOwnPropertyNames(obj._sprite).length === 0) {
        obj._sprite = {_default: [0, obj._duration * 1000]};
      }

      // fire the loaded event
      if (!obj._loaded) {
        obj._loaded = true;
        obj.on('load');
      }

      if (obj._autoplay) {
        obj.play();
      }
    };

    /**
     * Load the sound back into the buffer source.
     * @param  {Object} obj   The sound to load.
     * @param  {Array}  loop  Loop boolean, pos, and duration.
     * @param  {String} id    (optional) The play instance ID.
     */
    var refreshBuffer = function(obj, loop, id) {
      // determine which node to connect to
      var node = obj._nodeById(id);

      // setup the buffer source for playback
      node.bufferSource = ctx.createBufferSource();
      node.bufferSource.buffer = cache[obj._src];
      node.bufferSource.connect(node.panner);
      node.bufferSource.loop = loop[0];
      if (loop[0]) {
        node.bufferSource.loopStart = loop[1];
        node.bufferSource.loopEnd = loop[1] + loop[2];
      }
      node.bufferSource.playbackRate.value = obj._rate;
    };

  }

  /**
   * Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
   */
  if (typeof define === 'function' && define.amd) {
    define(function() {
      return {
        Howler: Howler,
        Howl: Howl
      };
    });
  }

  /**
   * Add support for CommonJS libraries such as browserify.
   */
  if (typeof exports !== 'undefined') {
    exports.Howler = Howler;
    exports.Howl = Howl;
  }

  // define globally in case AMD is not available or available but not used

  if (typeof window !== 'undefined') {
    window.Howler = Howler;
    window.Howl = Howl;
  }

})();

//     Underscore.js 1.7.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.7.0';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var createCallback = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  _.iteratee = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return createCallback(value, context, argCount);
    if (_.isObject(value)) return _.matches(value);
    return _.property(value);
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    if (obj == null) return obj;
    iteratee = createCallback(iteratee, context);
    var i, length = obj.length;
    if (length === +length) {
      for (i = 0; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    if (obj == null) return [];
    iteratee = _.iteratee(iteratee, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length),
        currentKey;
    for (var index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index = 0, currentKey;
    if (arguments.length < 3) {
      if (!length) throw new TypeError(reduceError);
      memo = obj[keys ? keys[index++] : index++];
    }
    for (; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
    if (obj == null) obj = [];
    iteratee = createCallback(iteratee, context, 4);
    var keys = obj.length !== + obj.length && _.keys(obj),
        index = (keys || obj).length,
        currentKey;
    if (arguments.length < 3) {
      if (!index) throw new TypeError(reduceError);
      memo = obj[keys ? keys[--index] : --index];
    }
    while (index--) {
      currentKey = keys ? keys[index] : index;
      memo = iteratee(memo, obj[currentKey], currentKey, obj);
    }
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    predicate = _.iteratee(predicate, context);
    _.some(obj, function(value, index, list) {
      if (predicate(value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    predicate = _.iteratee(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(_.iteratee(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    if (obj == null) return true;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    if (obj == null) return false;
    predicate = _.iteratee(predicate, context);
    var keys = obj.length !== +obj.length && _.keys(obj),
        length = (keys || obj).length,
        index, currentKey;
    for (index = 0; index < length; index++) {
      currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (obj.length !== +obj.length) obj = _.values(obj);
    return _.indexOf(obj, target) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = obj.length === +obj.length ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = obj && obj.length === +obj.length ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = _.iteratee(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = _.iteratee(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = low + high >>> 1;
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return obj.length === +obj.length ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = _.iteratee(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    for (var i = 0, length = input.length; i < length; i++) {
      var value = input[i];
      if (!_.isArray(value) && !_.isArguments(value)) {
        if (!strict) output.push(value);
      } else if (shallow) {
        push.apply(output, value);
      } else {
        flatten(value, shallow, strict, output);
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = _.iteratee(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i];
      if (isSorted) {
        if (!i || seen !== value) result.push(value);
        seen = value;
      } else if (iteratee) {
        var computed = iteratee(value, i, array);
        if (_.indexOf(seen, computed) < 0) {
          seen.push(computed);
          result.push(value);
        }
      } else if (_.indexOf(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true, []));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(slice.call(arguments, 1), true, true, []);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function(array) {
    if (array == null) return [];
    var length = _.max(arguments, 'length').length;
    var results = Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var idx = array.length;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var Ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    args = slice.call(arguments, 2);
    bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      Ctor.prototype = func.prototype;
      var self = new Ctor;
      Ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (_.isObject(result)) return result;
      return self;
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = hasher ? hasher.apply(this, arguments) : key;
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed before being called N times.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      } else {
        func = null;
      }
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    if (!_.isObject(obj)) return obj;
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (hasOwnProperty.call(source, prop)) {
            obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj, iteratee, context) {
    var result = {}, key;
    if (obj == null) return result;
    if (_.isFunction(iteratee)) {
      iteratee = createCallback(iteratee, context);
      for (key in obj) {
        var value = obj[key];
        if (iteratee(value, key, obj)) result[key] = value;
      }
    } else {
      var keys = concat.apply([], slice.call(arguments, 1));
      obj = new Object(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (key in obj) result[key] = obj[key];
      }
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    if (!_.isObject(obj)) return obj;
    for (var i = 1, length = arguments.length; i < length; i++) {
      var source = arguments[i];
      for (var prop in source) {
        if (obj[prop] === void 0) obj[prop] = source[prop];
      }
    }
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (
      aCtor !== bCtor &&
      // Handle Object.create(x) cases
      'constructor' in a && 'constructor' in b &&
      !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
        _.isFunction(bCtor) && bCtor instanceof bCtor)
    ) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size, result;
    // Recursively compare objects and arrays.
    if (className === '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size === b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      size = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      result = _.keys(b).length === size;
      if (result) {
        while (size--) {
          // Deep compare each member
          key = keys[size];
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
  if (typeof /./ !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    var pairs = _.pairs(attrs), length = pairs.length;
    return function(obj) {
      if (obj == null) return !length;
      obj = new Object(obj);
      for (var i = 0; i < length; i++) {
        var pair = pairs[i], key = pair[0];
        if (pair[1] !== obj[key] || !(key in obj)) return false;
      }
      return true;
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = createCallback(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? object[property]() : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

var WebAudiox	= WebAudiox	|| {}

WebAudiox.AbsoluteNormalizer	= function(){
	var maxThreshold	= -Infinity;
	var minThreshold	= +Infinity;
	this.update	= function(value){
		// TODO make be good to smooth those values over time, thus it would forget
		// it would be the adaptative
		// and this one being absolute
		if( value < minThreshold ) minThreshold	= value
		if( value > maxThreshold ) maxThreshold = value
		// to avoid division by zero
		if( maxThreshold === minThreshold )	return value;
		// compute normalized value
		var normalized	= (value - minThreshold) / (maxThreshold-minThreshold);
		// return the just built normalized value between [0, 1]
		return normalized;
	}
}


var WebAudiox	= WebAudiox	|| {}

// TODO to rewrite with a simple weight average on a history array
// - simple and no magic involved

WebAudiox.AdaptativeNormalizer	= function(factorForMin, factorForMax){
	var minThreshold	= 0;
	var maxThreshold	= 1;
	this.update	= function(value){
		// smooth adapatation
		var smoothOut	= 0.01
		var smoothIn	= 0.01
		if( value < minThreshold )	minThreshold += (value-minThreshold)*smoothOut
		else				minThreshold += (value-minThreshold)*smoothIn
		if( value > maxThreshold )	maxThreshold += (value-maxThreshold)*smoothOut
		else				maxThreshold += (value-maxThreshold)*smoothIn
		// ensure bound are respected
		if( value < minThreshold ) value = minThreshold
		if( value > maxThreshold ) value = maxThreshold
		// to avoid division by zero
		if( maxThreshold === minThreshold )	return value;
		// compute normalized value
console.log(minThreshold.toFixed(10),maxThreshold.toFixed(10))
		var normalized	= (value - minThreshold) / (maxThreshold-minThreshold);
		// return the just built normalized value between [0, 1]
		return normalized;
	}
}

// @namespace defined WebAudiox name space
var WebAudiox	= WebAudiox	|| {}

/**
 * display an analyser node in a canvas
 * 
 * @param  {AnalyserNode} analyser     the analyser node
 * @param  {Number}	smoothFactor the smooth factor for smoothed volume
 */
WebAudiox.Analyser2Volume	= function(analyser, smoothFactor){
	// arguments default values
	smoothFactor	= smoothFactor !== undefined ? smoothFactor : 0.1
	/**
	 * return the raw volume
	 * @return {Number} value between 0 and 1
	 */
	this.rawValue		= function(){
		var rawVolume	= WebAudiox.Analyser2Volume.compute(analyser)
		return rawVolume
	}
	
	var smoothedVolume	= null
	/**
	 * [smoothedValue description]
	 * @return {[type]} [description]
	 */
	this.smoothedValue	= function(){
		var rawVolume	= WebAudiox.Analyser2Volume.compute(analyser)
		// compute smoothedVolume
		if( smoothedVolume === null )	smoothedVolume	= rawVolume
		smoothedVolume	+= (rawVolume  - smoothedVolume) * smoothFactor		
		// return the just computed value
		return smoothedVolume
	}
}

/**
 * do a average on a ByteFrequencyData from an analyser node
 * @param  {AnalyserNode} analyser the analyser node
 * @param  {Number} width    how many elements of the array will be considered
 * @param  {Number} offset   the index of the element to consider
 * @return {Number}          the ByteFrequency average
 */
WebAudiox.Analyser2Volume.compute	= function(analyser, width, offset){
	// handle paramerter
	width		= width  !== undefined ? width	: analyser.frequencyBinCount;
	offset		= offset !== undefined ? offset	: 0;
	// inint variable
	var freqByte	= new Uint8Array(analyser.frequencyBinCount);
	// get the frequency data
	analyser.getByteFrequencyData(freqByte);
	// compute the sum
	var sum	= 0;
	for(var i = offset; i < offset+width; i++){
		sum	+= freqByte[i];
	}
	// complute the amplitude
	var amplitude	= sum / (width*256-1);
	// return ampliture
	return amplitude;
}

var WebAudiox	= WebAudiox	|| {}

/**
 * Generate a binaural sounds
 * http://htmlpreview.github.io/?https://github.com/ichabodcole/BinauralBeatJS/blob/master/examples/index.html
 * http://en.wikipedia.org/wiki/Binaural_beats
 * 
 * @param {Number} pitch    the frequency of the pitch (e.g. 440hz)
 * @param {Number} beatRate the beat rate of the binaural sound (e.g. around 2-10hz)
 * @param {Number} gain     the gain applied on the result
 */
WebAudiox.BinauralSource	= function(context, pitch, beatRate, gain){
	pitch	= pitch !== undefined ? pitch : 440
	beatRate= beatRate !== undefined ? beatRate : 5
	gain	= gain !== undefined ? gain : 1

	var gainNode	= context.createGain()
	this.output	= gainNode
	var destination	= gainNode
	
	var compressor	= context.createDynamicsCompressor();
	compressor.connect(destination)
	destination	= compressor

	var channelMerge= context.createChannelMerger()
	channelMerge.connect(destination)
	destination	= channelMerge
	
	var leftOscil	= context.createOscillator()
	leftOscil.connect(destination)

	var rightOscil	= context.createOscillator()
	rightOscil.connect(destination)
	
	var updateNodes	= function(){
		gainNode.gain.value		= gain
		leftOscil.frequency.value	= pitch - beatRate/2
		rightOscil.frequency.value	= pitch + beatRate/2	
	}
	// do the initial update
	updateNodes();

	this.getGain	= function(){
		return gain
	}
	this.setGain	= function(value){
		gain	= value
		updateNodes();		
	}
	this.getPitch	= function(){
		return pitch
	}
	this.setPitch	= function(value){
		pitch	= value
		updateNodes();		
	}
	this.getBeatRate= function(){
		return beatRate
	}
	this.setBeatRate= function(value){
		beatRate	= value
		updateNodes();		
	}
	/**
	 * start the source
	 */
	this.start	= function(delay){
		delay	= delay !== undefined ? delay : 0
		leftOscil.start(delay)
		rightOscil.start(delay)
	}
	/** 
	 * stop the source
	 */
	this.stop	= function(delay){
		delay	= delay !== undefined ? delay : 0
		leftOscil.stop(delay)
		rightOscil.stop(delay)
	}
}
var WebAudiox	= WebAudiox	|| {}


/**
 * source is integers from 0 to 255,  destination is float from 0 to 1 non included
 * source and destination may not have the same length.
 * 
 * @param {Array} srcArray       the source array
 * @param {Array} dstArray       the destination array
 * @param {Number|undefined} dstArrayLength the length of the destination array. If not provided
 *                               dstArray.length value is used.
 */
WebAudiox.ByteToNormalizedFloat32Array	= function(srcArray, dstArray, dstArrayLength){
	dstArrayLength	= dstArrayLength !== undefined ? dstArrayLength : dstArray.length
	var ratio	= srcArray.length / dstArrayLength
	for(var i = 0; i < dstArray.length; i++){
		var first	= Math.round((i+0) * ratio)
		var last	= Math.round((i+1) * ratio)
		last		= Math.min(srcArray.length-1, last)
		for(var j = first, sum = 0; j <= last; j++){
			sum	+= srcArray[j]/256;
		}
		dstArray[i]	= sum/(last-first+1);
	}
}
var WebAudiox	= WebAudiox	|| {}

/**
 * generate buffer with jsfx.js 
 * @param  {AudioContext} context the WebAudio API context
 * @param  {Array} lib     parameter for jsfx
 * @return {[type]}         the just built buffer
 */
WebAudiox.getBufferFromJsfx	= function(context, lib){
	var params	= jsfxlib.arrayToParams(lib);
	var data	= jsfx.generate(params);
	var buffer	= context.createBuffer(1, data.length, 44100);
	var fArray	= buffer.getChannelData(0);
	for(var i = 0; i < fArray.length; i++){
		fArray[i]	= data[i];
	}
	return buffer;
}
/**
 * @namespace definition of WebAudiox
 * @type {object}
 */
var WebAudiox	= WebAudiox	|| {}

/**
 * definition of a lineOut
 * @constructor
 * @param  {AudioContext} context WebAudio API context
 */
WebAudiox.LineOut	= function(context){
	// init this.destination
	this.destination= context.destination

	// this.destination to support muteWithVisibility
	var visibilityGain	= context.createGain()
	visibilityGain.connect(this.destination)			
	muteWithVisibility(visibilityGain)
	this.destination= visibilityGain

	// this.destination to support webAudiox.toggleMute() and webAudiox.isMuted
	var muteGain	= context.createGain()
	muteGain.connect(this.destination)
	this.destination= muteGain
	this.isMuted	= false
	this.toggleMute = function(){
		this.isMuted		= this.isMuted ? false : true;
		muteGain.gain.value	= this.isMuted ? 0 : 1;
	}.bind(this)

	//  to support webAudiox.volume
	var volumeNode	= context.createGain()
	volumeNode.connect( this.destination )	
	this.destination= volumeNode
	Object.defineProperty(this, 'volume', {
		get : function(){
			return volumeNode.gain.value; 
		},
                set : function(value){
			volumeNode.gain.value	= value;
		}
	});

	return;	

	//////////////////////////////////////////////////////////////////////////////////
	//		muteWithVisibility helper					//
	//////////////////////////////////////////////////////////////////////////////////
	/**
	 * mute a gainNode when the page isnt visible
	 * @param  {Node} gainNode the gainNode to mute/unmute
	 */
	function muteWithVisibility(gainNode){
		// shim to handle browser vendor
		var eventStr	= (document.hidden !== undefined	? 'visibilitychange'	:
			(document.mozHidden	!== undefined		? 'mozvisibilitychange'	:
			(document.msHidden	!== undefined		? 'msvisibilitychange'	:
			(document.webkitHidden	!== undefined		? 'webkitvisibilitychange' :
			console.assert(false, "Page Visibility API unsupported")
		))));
		var documentStr	= (document.hidden !== undefined ? 'hidden' :
			(document.mozHidden	!== undefined ? 'mozHidden' :
			(document.msHidden	!== undefined ? 'msHidden' :
			(document.webkitHidden	!== undefined ? 'webkitHidden' :
			console.assert(false, "Page Visibility API unsupported")
		))));
		// event handler for visibilitychange event
		var callback	= function(){
			var isHidden	= document[documentStr] ? true : false
			gainNode.gain.value	= isHidden ? 0 : 1
		}.bind(this)
		// bind the event itself
		document.addEventListener(eventStr, callback, false)
		// destructor
		this.destroy	= function(){
			document.removeEventListener(eventStr, callback, false)
		}
	}
}
var WebAudiox	= WebAudiox	|| {}

/**
 * Helper to load a buffer
 * 
 * @param  {AudioContext} context the WebAudio API context
 * @param  {String} url     the url of the sound to load
 * @param  {Function} onLoad  callback to notify when the buffer is loaded and decoded
 * @param  {Function} onError callback to notify when an error occured
 */
WebAudiox.loadBuffer	= function(context, url, onLoad, onError){
	onLoad		= onLoad	|| function(buffer){}
	onError		= onError	|| function(){}
        if( url instanceof Blob ){
		var request	= new FileReader();
        } else {
		var request	= new XMLHttpRequest()
		request.open('GET', url, true)
		request.responseType	= 'arraybuffer'
        }
	// counter inProgress request
	WebAudiox.loadBuffer.inProgressCount++
	request.onload	= function(){
		context.decodeAudioData(request.response, function(buffer){
			// counter inProgress request
			WebAudiox.loadBuffer.inProgressCount--
			// notify the callback
			onLoad(buffer)			
			// notify
			WebAudiox.loadBuffer.onLoad(context, url, buffer)
		}, function(){
			// notify the callback
			onError()
			// counter inProgress request
			WebAudiox.loadBuffer.inProgressCount--
		})
	}
	request.send()
}

/**
 * global onLoad callback. it is notified everytime .loadBuffer() load something
 * @param  {AudioContext} context the WebAudio API context
 * @param  {String} url     the url of the sound to load
 * @param {[type]} buffer the just loaded buffer
 */
WebAudiox.loadBuffer.onLoad	= function(context, url, buffer){}

/**
 * counter of all the .loadBuffer in progress. usefull to know is all your sounds
 * as been loaded
 * @type {Number}
 */
WebAudiox.loadBuffer.inProgressCount	= 0



/**
 * shim to get AudioContext
 */
window.AudioContext	= window.AudioContext || window.webkitAudioContext;
// @namespace
var WebAudiox	= WebAudiox	|| {}

//////////////////////////////////////////////////////////////////////////////////
//		for Listener							//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Set Position of the listener based on THREE.Vector3  
 * 
 * @param  {AudioContext} context  the webaudio api context
 * @param {THREE.Vector3} position the position to use
 */
WebAudiox.ListenerSetPosition	= function(context, position){
	context.listener.setPosition(position.x, position.y, position.z)
}

/**
 * Set Position and Orientation of the listener based on object3d  
 * 
 * @param {[type]} panner   the panner node
 * @param {THREE.Object3D} object3d the object3d to use
 */
WebAudiox.ListenerSetObject3D	= function(context, object3d){
	// ensure object3d.matrixWorld is up to date
	object3d.updateMatrixWorld()
	// get matrixWorld
	var matrixWorld	= object3d.matrixWorld
	////////////////////////////////////////////////////////////////////////
	// set position
	var position	= new THREE.Vector3().getPositionFromMatrix(matrixWorld)
	context.listener.setPosition(position.x, position.y, position.z)

	////////////////////////////////////////////////////////////////////////
	// set orientation
	var mOrientation= matrixWorld.clone();
	// zero the translation
	mOrientation.setPosition({x : 0, y: 0, z: 0});
	// Compute Front vector: Multiply the 0,0,1 vector by the world matrix and normalize the result.
	var vFront= new THREE.Vector3(0,0,1);
	vFront.applyMatrix4(mOrientation)
	vFront.normalize();
	// Compute UP vector: Multiply the 0,-1,0 vector by the world matrix and normalize the result.
	var vUp= new THREE.Vector3(0,-1, 0);
	vUp.applyMatrix4(mOrientation)
	vUp.normalize();
	// Set panner orientation
	context.listener.setOrientation(vFront.x, vFront.y, vFront.z, vUp.x, vUp.y, vUp.z);
}

/**
 * update webaudio context listener with three.Object3D position
 * 
 * @constructor
 * @param  {AudioContext} context  the webaudio api context
 * @param  {THREE.Object3D} object3d the object for the listenre
 */
WebAudiox.ListenerObject3DUpdater	= function(context, object3d){	
	var prevPosition= null
	this.update	= function(delta){
		// update the position/orientation
		WebAudiox.ListenerSetObject3D(context, object3d)

		////////////////////////////////////////////////////////////////////////
		// set velocity
		var matrixWorld	= object3d.matrixWorld
		if( prevPosition === null ){
			prevPosition	= new THREE.Vector3().getPositionFromMatrix(matrixWorld);
		}else{
			var position	= new THREE.Vector3().getPositionFromMatrix(matrixWorld);
			var velocity	= position.clone().sub(prevPosition).divideScalar(delta);
			prevPosition.copy(position)
			context.listener.setVelocity(velocity.x, velocity.y, velocity.z);
		}
	}
}


//////////////////////////////////////////////////////////////////////////////////
//		for Panner							//
//////////////////////////////////////////////////////////////////////////////////


/**
 * Set Position of the panner node based on THREE.Vector3  
 * 
 * @param {[type]} panner   the panner node
 * @param {THREE.Vector3} position the position to use
 */
WebAudiox.PannerSetPosition	= function(panner, position){
	panner.setPosition(position.x, position.y, position.z)
}

/**
 * Set Position and Orientation of the panner node based on object3d  
 * 
 * @param {[type]} panner   the panner node
 * @param {THREE.Object3D} object3d the object3d to use
 */
WebAudiox.PannerSetObject3D	= function(panner, object3d){
	// ensure object3d.matrixWorld is up to date
	object3d.updateMatrixWorld()
	// get matrixWorld
	var matrixWorld	= object3d.matrixWorld
	
	////////////////////////////////////////////////////////////////////////
	// set position
	var position	= new THREE.Vector3().getPositionFromMatrix(matrixWorld)
	panner.setPosition(position.x, position.y, position.z)

	////////////////////////////////////////////////////////////////////////
	// set orientation
	var vOrientation= new THREE.Vector3(0,0,1);
	var mOrientation= matrixWorld.clone();
	// zero the translation
	mOrientation.setPosition({x : 0, y: 0, z: 0});
	// Multiply the 0,0,1 vector by the world matrix and normalize the result.
	vOrientation.applyMatrix4(mOrientation)
	vOrientation.normalize();
	// Set panner orientation
	panner.setOrientation(vOrientation.x, vOrientation.y, vOrientation.z);
}

/**
 * update panner position based on a object3d position
 * 
 * @constructor
 * @param  {[type]} panner   the panner node to update
 * @param  {THREE.Object3D} object3d the object from which we take the position
 */
WebAudiox.PannerObject3DUpdater	= function(panner, object3d){
	var prevPosition= null
	// set the initial position
	WebAudiox.PannerSetObject3D(panner, object3d)
	// the update function
	this.update	= function(delta){
		// update the position/orientation
		WebAudiox.PannerSetObject3D(panner, object3d)

		////////////////////////////////////////////////////////////////////////
		// set velocity
		var matrixWorld	= object3d.matrixWorld
		if( prevPosition === null ){
			prevPosition	= new THREE.Vector3().getPositionFromMatrix(matrixWorld);
		}else{
			var position	= new THREE.Vector3().getPositionFromMatrix(matrixWorld);
			var velocity	= position.clone().sub(prevPosition).divideScalar(delta);
			prevPosition.copy( position )
			panner.setVelocity(velocity.x, velocity.y, velocity.z);
		}
	}
}

// @namespace defined WebAudiox namespace
var WebAudiox	= WebAudiox	|| {}

/**
 * display an analyser node in a canvas
 * 
 * @param  {AnalyserNode} analyser     the analyser node
 * @param  {Number}	  smoothFactor the smooth factor for smoothed volume
 */
WebAudiox.Analyser2Canvas	= function(analyser, canvas){
	var canvasCtx		= canvas.getContext("2d")

	var gradient	= canvasCtx.createLinearGradient(0,0,0,canvas.height)
	gradient.addColorStop(1.00,'#000000')
	gradient.addColorStop(0.75,'#ff0000')
	gradient.addColorStop(0.25,'#ffff00')
	gradient.addColorStop(0.00,'#ffffff')
	canvasCtx.fillStyle	= gradient
	
	canvasCtx.lineWidth	= 5;
	canvasCtx.strokeStyle	= "rgb(255, 255, 255)";

	var analyser2volume	= new WebAudiox.Analyser2Volume(analyser)
	
	this.update	= function(){
		//////////////////////////////////////////////////////////////////////////////////
		//		comment								//
		//////////////////////////////////////////////////////////////////////////////////

		// draw a circle
		var maxRadius	= Math.min(canvas.height, canvas.width) * 0.3
		var radius	= 1 + analyser2volume.rawValue() * maxRadius;
		canvasCtx.beginPath()
		canvasCtx.arc(canvas.width*1.5/2, canvas.height*0.5/2, radius, 0, Math.PI*2, true)
		canvasCtx.closePath()
		canvasCtx.fill()
		
		// draw a circle
		var radius	= 1 + analyser2volume.smoothedValue() * maxRadius
		canvasCtx.beginPath()
		canvasCtx.arc(canvas.width*1.5/2, canvas.height*0.5/2, radius, 0, Math.PI*2, true)
		canvasCtx.closePath()
		canvasCtx.stroke()

		//////////////////////////////////////////////////////////////////////////////////
		//		display	ByteFrequencyData					//
		//////////////////////////////////////////////////////////////////////////////////

		// get the average for the first channel
		var freqData	= new Uint8Array(analyser.frequencyBinCount)
		analyser.getByteFrequencyData(freqData)
		// normalized
		var histogram	= new Float32Array(10)
		WebAudiox.ByteToNormalizedFloat32Array(freqData, histogram)
		// draw the spectrum
		var barStep	= canvas.width / (histogram.length-1)
		var barWidth	= barStep*0.8
		canvasCtx.fillStyle	= gradient
		for(var i = 0; i < histogram.length; i++){
			canvasCtx.fillRect(i*barStep, (1-histogram[i])*canvas.height, barWidth, canvas.height)
		}
		
		//////////////////////////////////////////////////////////////////////////////////
		//		display ByteTimeDomainData					//
		//////////////////////////////////////////////////////////////////////////////////
		
		canvasCtx.lineWidth	= 5;
		canvasCtx.strokeStyle = "rgb(255, 255, 255)";
		// get the average for the first channel
		var timeData	= new Uint8Array(analyser.fftSize)
		analyser.getByteTimeDomainData(timeData)
		// normalized
		var histogram	= new Float32Array(60)
		WebAudiox.ByteToNormalizedFloat32Array(timeData, histogram)
		// amplify the histogram
		for(var i = 0; i < histogram.length; i++) {
			histogram[i]	= (histogram[i]-0.5)*1.5+0.5
		}
		// draw the spectrum		
		var barStep	= canvas.width / (histogram.length-1)
		canvasCtx.beginPath()
		for(var i = 0; i < histogram.length; i++) {
			histogram[i]	= (histogram[i]-0.5)*1.5+0.5
			canvasCtx.lineTo(i*barStep, (1-histogram[i])*canvas.height)
		}
		canvasCtx.stroke()
	}	
}
// @namespace defined WebAudiox namespace
var WebAudiox	= WebAudiox	|| {}

/**
 * display an analyser node in a canvas
 * * See http://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/
 * 
 * @param  {AnalyserNode} analyser     the analyser node
 * @param  {Number}	  smoothFactor the smooth factor for smoothed volume
 */
WebAudiox.AnalyserBeatDetector	= function(analyser, onBeat){
	// arguments default values
	this.holdTime		= 0.33
	this.decayRate		= 0.97
	this.minVolume		= 0.2
	this.frequencyBinCount	= 100

	var holdingTime	= 0
	var threshold	= this.minVolume
	this.update	= function(delta){
		var rawVolume	= WebAudiox.AnalyserBeatDetector.compute(analyser, this.frequencyBinCount)
		if( holdingTime > 0 ){
			holdingTime	-= delta
			holdingTime	= Math.max(holdingTime, 0)
		}else if( rawVolume > threshold ){
			onBeat()
			holdingTime	= this.holdTime;
			threshold	= rawVolume * 1.1;
			threshold	= Math.max(threshold, this.minVolume);	
		}else{
			threshold	*= this.decayRate;
			threshold	= Math.max(threshold, this.minVolume);	
		}
	}
}

/**
 * do a average on a ByteFrequencyData from an analyser node
 * @param  {AnalyserNode} analyser the analyser node
 * @param  {Number} width    how many elements of the array will be considered
 * @param  {Number} offset   the index of the element to consider
 * @return {Number}          the ByteFrequency average
 */
WebAudiox.AnalyserBeatDetector.compute	= function(analyser, width, offset){
	// handle paramerter
	width		= width  !== undefined ? width	: analyser.frequencyBinCount;
	offset		= offset !== undefined ? offset	: 0;
	// inint variable
	var freqByte	= new Uint8Array(analyser.frequencyBinCount);
	// get the frequency data
	analyser.getByteFrequencyData(freqByte);
	// compute the sum
	var sum	= 0;
	for(var i = offset; i < offset+width; i++){
		sum	+= freqByte[i];
	}
	// complute the amplitude
	var amplitude	= sum / (width*256-1);
	// return ampliture
	return amplitude;
}


// @namespace defined WebAudiox namespace
var WebAudiox	= WebAudiox	|| {}


WebAudiox.addAnalyserBeatDetectorDatGui	= function(beatDetector, datGui){
	datGui		= datGui || new dat.GUI()
	
	var folder	= datGui.addFolder('Beat Detector');
	folder.add(beatDetector, 'holdTime'		, 0.0, 4)
	folder.add(beatDetector, 'decayRate'		, 0.1, 1.0)
	folder.add(beatDetector, 'minVolume'		, 0.0, 1.0)
	folder.add(beatDetector, 'frequencyBinCount'	, 1, 1024).step(1)
	folder.open();
}/**
 * @namespace
 */
var WebAudiox	= WebAudiox	|| {}


//////////////////////////////////////////////////////////////////////////////////
//		WebAudiox.GameSounds
//////////////////////////////////////////////////////////////////////////////////

/**
 * a specific helpers for gamedevs to make WebAudio API easy to use for their case
 */
WebAudiox.GameSounds	= function(){
	// create WebAudio API context
	var context	= new AudioContext()
	this.context	= context

	// Create lineOut
	var lineOut	= new WebAudiox.LineOut(context)
	this.lineOut	= lineOut
	
	var clips	= {}
	this.clips	= clips
	
	/**
	 * show if the Web Audio API is detected or not
	 * 
	 * @type {boolean}
	 */
	this.webAudioDetected	= AudioContext ? true : false

	//////////////////////////////////////////////////////////////////////////////////
	//		update loop							//
	//////////////////////////////////////////////////////////////////////////////////

	/**
	 * the update function
	 * 
	 * @param  {Number} delta seconds since the last iteration
	 */
	this.update	= function(delta){
		// update each clips
		Object.keys(clips).forEach(function(label){
			var sound	= clips[label]
			sound.update(delta)
		})
	}

	//////////////////////////////////////////////////////////////////////////////////
	//		create Sound							//
	//////////////////////////////////////////////////////////////////////////////////
			
	/**
	 * create a sound from this context
	 * @param  {Object} options the default option for this sound, optional
	 * @return {WebAudiox.GameSound}	the created sound
	 */
	this.createClip	= function(options){
		return new WebAudiox.GameSoundClip(this, options)
	}
}


//////////////////////////////////////////////////////////////////////////////////
//		WebAudiox.GameSoundListener
//////////////////////////////////////////////////////////////////////////////////


WebAudiox.GameSoundListener	= function(gameSounds){
	var context		= gameSounds.context
	this.listenerUpdater	= null
	//////////////////////////////////////////////////////////////////////////////////
	//		update loop							//
	//////////////////////////////////////////////////////////////////////////////////
	
	/**
	 * the update function
	 * 
	 * @param  {Number} delta seconds since the last iteration
	 */
	this.update	= function(delta){
		if( this.listenerUpdater ){
			this.listenerUpdater.update(delta)
		}
	}

	//////////////////////////////////////////////////////////////////////////////////
	//		handle .at
	//////////////////////////////////////////////////////////////////////////////////
	/**
	 * Set the listener position
	 * @param  {THREE.Vector3|THREE.Object3D} position the position to copy
	 * @return {WebAudiox.GameSounds} the object itself for linked API
	 */
	this.at	= function(position){
		if( position instanceof THREE.Vector3 ){
			WebAudiox.ListenerSetPosition(context, position)	
		}else if( position instanceof THREE.Object3D ){
			WebAudiox.ListenerSetObject3D(context, position)	
		}else	console.assert(false)
		return this
	}

	//////////////////////////////////////////////////////////////////////////////////
	//		handle .follow/.unFollow					//
	//////////////////////////////////////////////////////////////////////////////////
	
	/**
	 * Make the listener follow a three.js THREE.Object3D
	 * 
	 * @param  {THREE.Object3D} object3d the object to follow
	 * @return {WebAudiox.GameSounds} the object itself for linked API
	 */
	this.startFollow= function(object3d){
		// put a ListenerObject3DUpdater
		this.listenerUpdater	= new WebAudiox.ListenerObject3DUpdater(context, object3d)
		return this
	}
	
	/**
	 * Make the listener Stop Following the object 
	 * @return {WebAudiox.GameSounds} the object itself for linked API
	 */
	this.stopFollow	= function(){
		context.listener.setVelocity(0,0,0);
		this.listenerUpdater	= null	
		return this
	}
}

//////////////////////////////////////////////////////////////////////////////////
//		WebAudiox.GameSoundClip
//////////////////////////////////////////////////////////////////////////////////

/**
 * a sound from WebAudiox.GameSounds
 * @param {WebAudiox.GameSounds} gameSounds     
 * @param {Object} defaultOptions the default play options
 */
WebAudiox.GameSoundClip	= function(gameSounds, defaultOptions){
	this.gameSounds		= gameSounds	|| console.assert(false)
	this.defaultOptions	= defaultOptions|| {}

	//////////////////////////////////////////////////////////////////////////////////
	//		register/unregister in gameSound				//
	//////////////////////////////////////////////////////////////////////////////////
		
	this.label	= null;	
	this.register	= function(label){
		console.assert(gameSounds.clips[label] === undefined, 'label already defined')
		gameSounds.clips[label]	= this
		return this;
	}
	this.unregister	= function(){
		if( this.label === null )	return;
		delete gameSounds.clips[label]
		return this;
	}
	
	//////////////////////////////////////////////////////////////////////////////////
	//		update loop							//
	//////////////////////////////////////////////////////////////////////////////////
	
	var updateFcts	= []
	this.update	= function(delta){
		updateFcts.forEach(function(updateFct){
			updateFct(delta)
		})
	}

	//////////////////////////////////////////////////////////////////////////////////
	//		load url							//
	//////////////////////////////////////////////////////////////////////////////////
	
	this.load	= function(url, onLoad, onError){
		this.loaded	= false
		this.buffer	= null
		WebAudiox.loadBuffer(gameSounds.context, url, function(decodedBuffer){
			this.loaded	= true
			this.buffer	= decodedBuffer;
			onLoad	&& onLoad(this)
		}.bind(this), onError)
		return this
	}

	//////////////////////////////////////////////////////////////////////////////////
	//		createSource
	//////////////////////////////////////////////////////////////////////////////////	

	this.createSource	= function(opts){
		opts		= opts	|| {}
		var dfl		= this.defaultOptions
		var options	= {
			at	: opts.at !== undefined		? opts.at 	: dfl.at,
			follow	: opts.follow !== undefined	? opts.follow	: dfl.follow,
			volume	: opts.volume !== undefined 	? opts.volume	: dfl.volume,
			loop	: opts.loop !== undefined	? opts.loop	: dfl.loop,
		}
		var gameSource	= new WebAudiox.GameSoundSource(this, opts)
		return gameSource;
	}
	this.play	= function(opts){
		return this.createSource(opts).play()
	}
}


//////////////////////////////////////////////////////////////////////////////////
//		WebAudiox.GameSoundSource
//////////////////////////////////////////////////////////////////////////////////

WebAudiox.GameSoundSource = function(gameSound, options) {
	options		= options	|| {}
	var utterance	= this
	var gameSounds	= gameSound.gameSounds
	var context	= gameSounds.context
	var destination	= gameSounds.lineOut.destination;

	// honor .at: vector3
	if( options.at !== undefined ){
		// init AudioPannerNode if needed
		if( utterance.pannerNode === undefined ){
			var panner	= context.createPanner()
			panner.connect(destination)
			utterance.pannerNode	= panner
			destination		= panner				
		}
		// set the value
		if( options.at instanceof THREE.Vector3 ){
			WebAudiox.PannerSetPosition(panner, options.at)			
		}else if( options.at instanceof THREE.Object3D ){
			WebAudiox.PannerSetObject3D(panner, options.at.position)			
		}else	console.assert(false, 'invalid type for .at')
	}

	// honor .follow: mesh
	if( options.follow !== undefined ){
		// init AudioPannerNode if needed
		if( utterance.pannerNode === undefined ){
			var panner	= context.createPanner()
			panner.connect(destination)
			utterance.pannerNode	= panner
			destination		= panner				
		}
		// put a PannerObject3DUpdater
		var pannerUpdater	= new WebAudiox.PannerObject3DUpdater(panner, options.follow)
		utterance.pannerUpdater	= pannerUpdater
		utterance.stopFollow	= function(){
			updateFcts.splice(updateFcts.indexOf(updatePannerUpdater), 1)
			delete	utterance.pannerUpdater
		}
		function updatePannerUpdater(delta, now){
			pannerUpdater.update(delta, now)
		}			
		updateFcts.push(updatePannerUpdater)
	}

	// honor .volume = 0.3
	if( options.volume !== undefined ){
		var gain	= context.createGain();
		gain.gain.value	= options.volume
		gain.connect(destination)
		destination	= gain			
		utterance.gainNode	= gain
	}

	// init AudioBufferSourceNode
	var source	= context.createBufferSource()
	source.buffer	= gameSound.buffer
	source.connect(destination)
	destination	= source

	if( options.loop !== undefined )	source.loop	= options.loop
	utterance.sourceNode	= source

	// start the sound now
	utterance.play	= function(delay){
		delay	= delay !== undefined ? delay : 0		
		source.start(delay)
		return this
	}

	utterance.stop		= function(delay){
		delay	= delay !== undefined ? delay : 0		
		source.stop(delay)
		// TODO What if the sound is never stopped ? 
		// - the list of function will grow in the loop
		// - do a setTimeout with a estimation of duration ?
		if( this.stopFollow )	this.stopFollow()
		return this
	}
};


var Canvas = function(game, element) {
	this.element = element; 
	this.game = game; 

	// Create a 2d context 
	this.context = this.c = this.element.getContext("2d");

	// Default to no smooth scaling 
	this.smoothScaling(false);

	this.scale = game.scale; 
};

Canvas.prototype.clear = function() { 
	this.c.clearRect(0, 0, this.element.width, this.element.height);
};

Canvas.prototype.flood = function(fill) {
	this.c.fillStyle = fill;  
	this.c.fillRect(0, 0, this.element.width, this.element.height);
};

Canvas.prototype.drawSprite = function(info, x, y, opacity) {
	this.drawImage(info[0], info[1], info[2], info[3], info[4], x, y, opacity);
}; 

Canvas.prototype.drawImage = function(image, imageX, imageY, imageW, imageH, x, y, opacity) {

	// Handle alpha 
	if (!_.isUndefined(opacity)) {
		this.c.save(); 
		this.c.globalAlpha = opacity;
	}

	// Draw image 
	try {
	this.c.drawImage(image, imageX, imageY, imageW, imageH, x, y, imageW * this.scale, imageH * this.scale);
	} catch(err) {

	}

	// Much elegant 
	if (!_.isUndefined(opacity)) {
		this.c.restore();
	}
};

/**
 * Cross browser image scaling 
 */
Canvas.prototype.smoothScaling = function (value) {
	var c = this.context; 

	_.each(prefices(), function(prefix) {
		if (prefix === "") {
			c.imageSmoothingEnabled = false;
		} else {
			c[prefix + "ImageSmoothingEnabled"] = false;
		} 
	});

};



/**
 * Center 
 */
Canvas.prototype.centerX = function(value) {
	return this.centerObjectIn(value, this.width());
};

Canvas.prototype.centerY = function(value) {
	return this.centerObjectIn(value, this.height());
};

Canvas.prototype.centerObjectIn = function(obj, dest) {
	return (dest / 2)  - ((obj * this.scale) / 2); 

};

/**
 * Canvas width and height 
 */
Canvas.prototype.width = function() {
	return this.element.width; 
};

Canvas.prototype.height = function() {
	return this.element.height; 
};
var CanvasImage = function(url) {
	this.debug = false;
	this.translateColors = false; 

	this.canvas = document.createElement("canvas");
	this.canvas.width = 1;
	this.canvas.height = 1;
	this.context = this.c = this.canvas.getContext("2d"); 
	this.c.fillRect(0, 0, 1, 1);

	this.image = new Image();
	this.image.src = url;

	var self = this; 
	this.image.onload = function() { self.loaded(); }; 
}; 

CanvasImage.prototype.loaded = function() {

	this.canvas.width = this.image.width;
	this.canvas.height = this.image.height;

	this.context.drawImage(this.image, 0, 0);

	this.replaceColors(); 

	if (this.debug) {
		document.body.appendChild(this.canvas);
	}
};

CanvasImage.prototype.drawable = function() {
	return this.canvas;
};

CanvasImage.prototype.replaceColors = function() {

	if (this.translateColors) {

		var imageData = this.c.getImageData(0, 0, this.canvas.width, this.canvas.height);
		var data = imageData.data; 

		for (var i = 0; i < data.length; i += 4) {
			var r = data[i];
			var g = data[i + 1];
			var b = data[i + 2];
			var a = data[i + 3];

		//	var hex = (r * 65536) + (g * 256) + b; 
			var rgb = r + "," + g + "," + b;


			if (typeof this.translateColors[rgb] !== "undefined") {
					
				var newColor = hexToRGB(this.translateColors[rgb]);
			
				data[i] 	= newColor[0]; 
				data[i + 1] = newColor[1]; 
				data[i + 2] = newColor[2]; 
			}

		}

		this.c.putImageData(imageData, 0, 0);

	}
};

var Fish = function(canvas) {

	this.canvas = canvas; 

	// We determine the fish size by how many fish you've killed
	this.fishSize = Fish.fishKilled >= fishBeforeLevel2 ? 2 : 1; 

	// Spawn somewhere in canvas 
	this.direction = _.random(1, 2); 

	var randomHeight = _.random(canvas.height() - Fish.waterLevel, canvas.height() - 50); 

	this.position = [this.direction == 2 ?  -100 : 600, randomHeight];
	
	this.fishCountdown = false; 

};

Fish.prototype.bounds = function(bitey) {
	if (_.isUndefined(bitey)) {

		return [
			this.position[0], 
			this.position[1], 
			this.fishSize == 1 ? 50 : 100, 
			this.fishSize == 1 ? 32 : 64
		];
	} else {
		return [
			this.position[0] + (this.direction == 1 ? 0 : (this.fishSize == 1 ? 36 : 84) ), 
			this.position[1] + (this.fishSize == 1 ? 5 : 10), 
			20, 
			this.fishSize == 1 ? 20 : 40
		];
	}
};

Fish.prototype.die = function() {
	this.fishCountdown = 1; 
};

Fish.prototype.draw = function() {
	
	var sprite = this.direction + ((Fish.ticks % 2) * 2);

	if (this.fishCountdown !== false) {
		this.fishCountdown --; 

		sprite = this.direction + 4;
	}


	this.canvas.drawSprite(Fish.underwaterSprite.get("fish" + this.fishSize, sprite), this.position[0], this.position[1]);
	
	if (this.direction == 2) {
		this.position[0] += 3;
	} else {
		this.position[0] -= 3; 
	}

	// Dead fish 
	if (this.fishCountdown === 0) {
		return false; 
	}

	// Are we offscreen?
	if (this.position[0] > this.canvas.width() + 150 || this.position[0] < -150) {
		return false; 
	}

	// Return true if you want to keep being a fish!
	return true; 
};
var Game = function() {
	this.scale = 1; 
};
function prefices() {
	return ["", "o", "ms", "moz", "webkit"];
}

function hexToRGB(hex) {
	var components = [];

	// Shift and mask
	components.push( (hex >> (8 * 2) ) & 0xFF);
	components.push( (hex >> (8 * 1) ) & 0xFF);
	components.push( (hex >> (8 * 0) ) & 0xFF);

	return components;
}

function collides(a, b) {

	//  ( aLeft < bRight ) && (aLeft > bLeft)
	//  aX   < bX   + bW   && aX   > bX   && 
	//  aY   < bY   + bH   && aY   > bY  
	if (a[0] <= b[0] + b[2] && a[0] + a[2] >= b[0] &&
		a[1] <= b[1] + b[3] && a[1] + a[3] >= b[1]) {
		return true; 
	}

}

// LUDUM-style tests 
/*
console.log("--- Tests ---");
assert(true  , collides([0, 0, 5, 5], [3, 3, 5, 5]) );
assert(true  , collides([3, 3, 5, 5], [0, 0, 5, 5]) );

assert(false , collides([0, 0, 5, 5], [6, 6, 5, 5]) );
assert(false , collides([6, 6, 5, 5], [0, 0, 5, 5]) );

assert(false , collides([0, 0, 5, 5], [2, 10, 5, 5]) );

console.log("------------");


function assert(a, b) {
	if (a == b) {
		console.log("✓ Pass (" + a + " == " + b + ")");
	} else {
		console.log("X Fail (" + a + " != " + b + ")");
	}
}
*/
var Keys = function() {
	this.keys = [];

	this.onKeyDown = false; 
	this.onKeyUp = false; 

	this.codeToName = {
		38: "up",
		87: "up",
		40: "down",
		83: "down",
		37: "left",
		65: "left",
		39: "right",
		68: "right",
		32: "space", 
		27: "esc"
	};
};

Keys.prototype.pressing = function(name) {
	return _.indexOf(this.keys, name) !== -1;
};

Keys.prototype.keyDown = function(code) {

	var keyName = _.isUndefined(this.codeToName[code]) ? false : this.codeToName[code]; 

	if (this.onKeyDown){
		this.onKeyDown(keyName);
	}

	// Don't add twice 
	if (keyName && _.indexOf(this.keys, keyName) == -1) {
		this.keys.push(keyName); 
	}
};


Keys.prototype.keyUp = function(code) {
	// What key just changed?
	var keyName = _.isUndefined(this.codeToName[code]) ? false : this.codeToName[code]; 

	if (this.onKeyUp){
		this.onKeyUp(keyName);
	}

	this.keys = _.without(this.keys, keyName); 

};

Keys.prototype.bind = function() {
	var self = this; 

	window.onkeydown = function(event) {
		self.keyDown(event.keyCode); 

		// Cancel event 
		return false; 
	};

	window.onkeyup = function(event) {
		self.keyUp(event.keyCode); 

		// Cancel event	
		return false; 
	};

	window.onblur = function(event) {
		self.keys = []; 

		// Cancel event	
		return false; 
	};

};

var Particles = function() {

};

var Particle = function() {

};
var Player = function(game, canvas, which) {
	this.keyName = false; 
	this.zeroOneTwo = 0; 
	this.zeroOneTwoDirection = 1; 
	this.randomSlowChange = false; 

	this.canvas = canvas; 
	this.game = game; 

	this.position = [0, 0]; 
	this.platform = false; 

	this.isSubmarine = false; 
	this.onSubmarine = false; 

	var characterSchemes = [
		{
			"255,0,255" : 0x492B19,
			"100,255,0" : 0x000000
		},
		{ 
			"255,0,255" : 0xB09E8F,
			"100,255,0" : 0x402B20
		}
	];

	var characters = [[0, "0"], [1, "0"], [0, "1"], [1, "1"]];
	var character  = characters[which - 1]; 

	var player = new CanvasImage("assets/character" + character[1] + ".png"); 

	player.translateColors = characterSchemes[character[0]];

	this.sprite = new Sprite(player.drawable(), {
		walking: {
			offsetX: 0, 		
			offsetY: 0, 
			gridX: 16,
			gridY: 32
		},
		swimming: {
			offsetX: 0, 
			offsetY: 32,
			gridX: 32,
			gridY: 32
		}
	}); 

	this.lastDamageCause = false; 
	this.health = 5; 
	this.maxHealth = 5; 
	this.holdingBreath = true; 
	this.breathHurtRate = 200;
	this.holdingBreathFor = 0;

	this.hitByFish = false;
	this.damagedByFish = 0;

	this.firingMissile = true; 
	this.direction = 1; 

	this.startTime = Date.now(); 

	// Missiles 
	this.missiles = [ ]; 

};

// Since this changes quite a bit 
Player.prototype.height = function() {
	return ((this.isSubmarine) ? 20: 32) * this.game.scale;
};

// Note: convert player width to standard "waist size" units, i.e. 32w
Player.prototype.width = function() {
	return ((this.inWater) ? 32 : 16) * this.game.scale;
};


Player.prototype.bounds = function() {
	return [
		this.position[0], 
		this.position[1], 
		this.width(),
		this.height()
	];
};

/**
 * Loop 
 */
Player.prototype.draw = function() {
	var self = this;

	// How much time has elapsed 
	var elapsed = Date.now() - this.startTime ;

	// Animate every 100ms 
	if (elapsed > 100) {
		this.zeroOneTwo += this.zeroOneTwoDirection; 
	
		if (this.zeroOneTwo === 2 || this.zeroOneTwo === 0) {
			this.zeroOneTwoDirection = -1 * this.zeroOneTwoDirection;
		}

		this.startTime = Date.now();
	}


	if (!this.inWater) {
	
		// Gravity!
		this.position[1] += 5; 

	} else if (!this.isSubmarine) {

		this.position[1] += 1;

	} 

var waterY = this.canvas.height() - this.waterLevel;


	// You can't go above the water level when in water 
	if (this.inWater && this.position[1] < this.canvas.height() - this.waterLevel - 16) {
		this.position[1] = this.canvas.height() - this.waterLevel - 16;
	}

	// Do not go outside the bounds of the canvas 
	if (this.position[1] > this.canvas.height() - this.height()) {
		this.position[1] = this.canvas.height() - this.height();
	}

	
	if (this.position[1] < 0) {
		this.position[1] = 0;
	}


	// Check platform if we aren't a sub 
	if (this.platform && !this.isSubmarine) { 

		// If we are "on" it
		if (
			this.position[0] > this.platform[1] + 10 - (18 * this.game.scale) &&
			this.position[0] < this.platform[1] - 8 + (this.platform[3] * this.game.scale) 
		) {

			// Can't go through the top 
			if (this.position[1] > this.platform[0] - (32 * this.game.scale)  &&
				this.position[1] < this.platform[1] + (32 * this.game.scale)) {
				this.position[1] = this.platform[0] - (32 * this.game.scale) ; 
			}

		}


	}

	// Are we in the water?
	if (waterY < this.position[1] + 32) {
		this.inWater = true; 
	}

	// Are we under water without a sub?
	if (!this.isSubmarine && this.inWater) {
		
		// Fishes kill use instantly. Come on. Look at those teeth. 
		if (this.hitByFish) {
			this.lastDamageCause = "fish"; 

			this.health = 0; 
		}

		// Well, is our head under water though? 
		if (this.waterLevel > ( this.canvas.height() - this.position[1] - 10)) {
			this.headUnderWater = true; 
			// Are we holding our breath?
			if (this.holdingBreath) {
				this.holdingBreathFor++; 
			} 

			// Did we take damage yet?
			if (this.holdingBreathFor > this.breathHurtRate) {

				// Reset the counter 
				this.holdingBreathFor = 0;

				// Take damage 
				this.health--;

				this.lastDamageCause = "water"; 
			}

		} else {
			this.headUnderWater = false; 
			// Breath!
			if (this.holdingBreath && this.holdingBreathFor > 0) {
				this.holdingBreathFor -= 2; 
			} else {
				this.holdingBreathFor = 0;
			}
		}
	}


	if (_.random(1, 200) == 200) {
		this.randomSlowChange = ! this.randomSlowChange;
	}

	var zeroOneTwo = 1;
	
	var spriteNumber = 1; 

	var speed; 
	if (this.onSubmarine) {

		// This is a very simple endgame state - just draw the sub with the player on top 
		this.canvas.drawSprite(this.underwaterSprite.get("submarine", this.direction), this.position[0], this.position[1]);
		this.canvas.drawSprite(this.sprite.get("walking", 1), this.position[0], this.position[1] - 24);

	} else if (this.isSubmarine) { 
		
		spriteNumber = this.direction; 

		if (this.health < 3) {
			spriteNumber = this.direction + 4; 
		}

		if (this.hitByFish) {
			spriteNumber = this.direction + 2; 
			this.hitByFish = false; 
			this.damagedByFish++; 

			this.lastDamageCause = "fish"; 
	
		}

		// Check if the damage from the fish should cause a health loss 
		if (this.damagedByFish > 25) {
			this.health--;
			this.damagedByFish = 0; 
		}

		this.canvas.drawSprite(this.underwaterSprite.get("submarine", spriteNumber), this.position[0], this.position[1]);

		speed = 3; 

		if (this.keys.pressing("left")) {

			this.position[0] -= speed; 
			this.direction = 2; 

		} else if (this.keys.pressing("right")) {

			this.position[0] += speed; 
			this.direction = 1;
		} 

		if (this.keys.pressing("down")) {

			this.position[1] += speed; 
			velocityY = speed;

		} else if (this.keys.pressing("up")) {
			this.position[1] -= speed; 
			velocityY = -1 * speed;
		}

		// Missile 
		if (this.keys.pressing("space")) {
			
			if (!this.firingMissile) {
			
				this.missiles.push({
					position: [this.position[0] + 14, this.position[1] + 6],
					velocity: [this.direction == 1 ? 8 : -8, 0],
					direction: this.direction,
					hit: false, 
				});
			}

			this.firingMissile = true;

		} else {
			this.firingMissile = false; 
		}

	// Player 
	} else {

		var spriteToUse;
		if (this.inWater) {
			spriteToUse = "swimming"; 

			speed = 2; 


			if (this.keys.pressing("left")) {
				spriteNumber = 2;

				this.position[0] -= speed; 

			} else if (this.keys.pressing("right")) {
				spriteNumber = 4;

				this.position[0] += speed; 

			} 

			if (this.keys.pressing("down")) {
				spriteNumber = 1;

				this.position[1] += speed; 

			} else if (this.keys.pressing("up")) {
				spriteNumber = 3; 
				this.position[1] -= speed; 
			}

		} else {
			spriteToUse = "walking";

			if (this.keys.pressing("left")) {
				spriteNumber = 3 + this.zeroOneTwo; 
				this.position[0] -= 3; 
			} else if (this.keys.pressing("right")) {
				spriteNumber = 6 + this.zeroOneTwo;  
				this.position[0] += 3; 
			} else {
				spriteNumber = 1 + this.randomSlowChange;
			}

		}

		this.canvas.drawSprite(this.sprite.get(spriteToUse, spriteNumber), this.position[0], this.position[1]);

	}

	// Render each missile 
	this.missiles = _.filter(this.missiles, function(missile) {

		// Are we past the edges?
		if (missile.position[0] > 500 || missile.hit == 2) {
			return false; 
		}

		// Continue to propel 
		missile.position[0] += missile.velocity[0]; 
		missile.position[1] += missile.velocity[1]; 

		var sprite = missile.direction;

		if (missile.hit) {
			sprite = 3; 
			missile.hit = 2; 
		}

		self.canvas.drawSprite(self.underwaterSprite.get("missile", sprite), missile.position[0], missile.position[1]);

		// Keep it 
		return true; 

	});

	// If we are a submarine 
	if (this.isSubmarine) {

		// Draw a nice cover 
		var coverNumber = this.direction + 8;
		if (this.hitByFish) {
			coverNumber -= 2;
		}

		this.canvas.drawSprite(this.underwaterSprite.get("submarine", coverNumber), this.position[0], this.position[1]);
	}

};


var Sprite = function(image, data) {
	
	// Auto load urls 
	if (_.isString(image)) {
		this.image = new Image();
		this.image.src = image; 
	} else {
		this.image = image; 
	}

	this.data = data; 
};


Sprite.prototype.get = function(name, x, y) {
	
	// Defaults 
	x = _.isUndefined(x) ? 0 : (x - 1);
	y = _.isUndefined(y) ? 0 : (y - 1);

	var gridX = this.data[name].gridX; 
	var gridY = this.data[name].gridY; 

	var offsetX = this.data[name].offsetX; 
	var offsetY = this.data[name].offsetY; 

	return [ this.image, (gridX * x) + offsetX, (gridY * y) + offsetY, gridX, gridY ];

};


var debug = false; 
var debugConsole = false; 

var fishBeforeLevel2 = 8; 
var fishBeforeLevel3 = 16; 



window.onload = function() {

	// Play some music 
	var context = new AudioContext();

	var out = new WebAudiox.LineOut(context);

	var sourceNode; 
	var sourceNode2; 
	var sourceNode3; 

	var gainNode1 = context.createGain(); 
	var gainNode2 = context.createGain(); 
	var gainNode3 = context.createGain(); 

	gainNode1.connect(out.destination);
	gainNode2.connect(out.destination);
	gainNode3.connect(out.destination);

	gainNode1.gain.value = 1;
	gainNode2.gain.value = 0;
	gainNode3.gain.value = 0;

	WebAudiox.loadBuffer(context, "assets/sound/music.mp3", function(buffer) {

		// Play 
		sourceNode = context.createBufferSource();
		sourceNode.buffer = buffer;
		sourceNode.connect(gainNode1);
		sourceNode.loop = true; 
		sourceNode.loopEnd = 9.6; 

		sourceNode2 = context.createBufferSource();
		sourceNode2.buffer = buffer;
		sourceNode2.connect(gainNode2);
		sourceNode2.loop = true; 
		sourceNode2.loopStart = 9.6; 
		sourceNode2.loopEnd   = 2 * 9.6; 

		sourceNode3 = context.createBufferSource();
		sourceNode3.buffer = buffer;
		sourceNode3.connect(gainNode3);
		sourceNode3.loop = true; 
		sourceNode3.loopStart = 2 * 9.6; 
		sourceNode3.loopEnd   = 3 * 9.6; 
	
		sourceNode.start(0);
		sourceNode2.start(0, 9.6);
		sourceNode3.start(0, 2 * 9.6);


	});


	var game = new Game(); 
	game.scale = 2; 

	var canvas = new Canvas(game, document.getElementById("canvas")); 
	
	var c = canvas.context; 

	var start = new Sprite("assets/start.png", {
		button: {
			offsetX: 0,
			offsetY: 0,
			gridX: 52, 
			gridY: 18
		}
	});

	var ui = new Sprite("assets/ui.png", {
		heart: {
			offsetX: 0, 		
			offsetY: 0, 
			gridX: 8,
			gridY: 8
		},
		text: {
			offsetX: 0,
			offsetY: 8,
			gridX: 72,
			gridY: 16
		},
		cause: {
			offsetX: 0,
			offsetY: 40,
			gridX: 100,
			gridY: 8
		},
		score: {
			offsetX: 0,
			offsetY: 56,
			gridX: 100,
			gridY: 8
		},
		numbers: {
			offsetX: 0,
			offsetY: 64,
			gridX: 4,
			gridY: 8
		}
	}); 

	var underwater = new Sprite("assets/underwater.png", {
		submarine: {
			offsetX: 0, 		
			offsetY: 0, 
			gridX: 32,
			gridY: 32
		},
		missile: {
			offsetX: 0, 		
			offsetY: 64, 
			gridX: 16,
			gridY: 16
		},
		pipe: {
			offsetX: 0, 		
			offsetY: 32, 
			gridX: 32,
			gridY: 16
		},
		fish1: {
			offsetX: 0, 		
			offsetY: 96, 
			gridX: 32,
			gridY: 16
		},
		fish2: {
			offsetX: 0, 		
			offsetY: 112, 
			gridX: 64,
			gridY: 32
		},
		fish3: {
			offsetX: 0, 		
			offsetY: 144, 
			gridX: 64,
			gridY: 248
		}
	}); 

	Fish.underwaterSprite = underwater; 

	var player = new Player(game, canvas, _.random(1, 4));

	player.canvas = canvas; 
	player.inWater = false; 
	player.onSubmarine = false; 
	player.platform  = [canvas.centerY(18), canvas.centerX(52), 18, 52];
	player.position = [canvas.centerX(16), 0];
	player.underwaterSprite = underwater;

	var alternate = true; 
	var zeroOneTwo = 1; 
	var zeroOneTwoDirection = 1; 

	var startTime = Date.now(); 
	var tickTime = Date.now(); 
	var frames = 0; 
	var ticks = 0; 

	var waterDelay = 500; 
	var waterLevel = 0; 

	var healthTotal = 5; 
	var health = 5; 

	// Endgame 
	var distanceToPipe = 100;		
	var endgame = 0; 

	var fishes = []; 
	Fish.fishKilled = 0; 

	// Keys 
	var keys = new Keys();
	keys.bind();

	var paused = false; 
	var escReleased = true;

	keys.onKeyDown = function(name) {
		if (name == "esc") {
			if (escReleased) {
				escReleased = false; 
				paused = !paused; 
			}

			if (paused) {
				out.volume = 0;
			} else {
				out.volume = 1.0;
			}
		}
	};

	keys.onKeyUp = function(name) {
		if (name == "esc") {
			escReleased = true; 
		}
	};

	function loop() {

		if (paused) {
			
			// Request the next frame 
			window.requestAnimationFrame(loop);

			return ;
		}

		// Check for game over 
		if (player.health === 0) {

			canvas.flood("rgba(100, 0, 0, 0.8)");

			canvas.drawSprite(ui.get("text", 1), canvas.centerX(72), canvas.centerY(10)); 

			var causeSprite = player.lastDamageCause == "water" ? 1 : 2;
			canvas.drawSprite(ui.get("cause", 1, causeSprite), canvas.centerX(57), canvas.centerY(5) + 20); 

			return; 	
		}

		// Check for game won
		if (endgame > 200 && waterLevel < 0) {

			canvas.drawSprite(ui.get("text", 2), canvas.centerX(72), canvas.centerY(10)); 

			return; 
		}

		// Look for the 50ms tick 
		if (Date.now() - tickTime > 50) {
			ticks++; 
			Fish.ticks = ticks; 

			tickTime = Date.now(); 
		}

		canvas.clear();

		frames ++; 

		if ( frames % 10 == 1) {
			alternate = ! alternate;
		}

		if (frames % 2 == 1) {
			
			// Draw some water 
			if (waterLevel < canvas.height()) {
				waterLevel += 1; 
				player.waterLevel = waterLevel;
				Fish.waterLevel = waterLevel;
			}

		}
	
		var waterY = canvas.height() - waterLevel;

		// Water BG
		c.fillStyle = "rgba(34, 32, 52, 1)"; //"#30374E";
		c.fillRect(-1, canvas.height() - waterLevel , canvas.width(), waterLevel); 

		// Don't do this in the endgame 
		if (!endgame) { 

			// Had the platform been destroyed yet? 
			if (waterY < player.platform[1]) {
			
				// Destroy the platform 
				player.platform = false; 
			} else {

				// Place the "start button"
				if (waterLevel < 50) {
					canvas.drawSprite(start.get("button", 1, 1), canvas.centerX(52), canvas.centerY(18));
				
					if (waterLevel > 25) {
						canvas.drawSprite(start.get("button", 1, 2), canvas.centerX(52), canvas.centerY(18), ((waterLevel - 25) / 25));
					}

				} else if (waterLevel < 100) {

					// So code duplication 
					canvas.drawSprite(start.get("button", 1, 2), canvas.centerX(52), canvas.centerY(18));
				
				} else if (waterLevel < 400) {
					canvas.drawSprite(start.get("button", 1, 3), canvas.centerX(52), canvas.centerY(18));
					
					var whichDirt = 4; 
					//if (waterLevel > 120) {
					//	whichDirt++; 
					//}	
					
					canvas.drawSprite(start.get("button", 1, whichDirt), canvas.centerX(52), canvas.centerY(18) + ((waterLevel - 100) * 3) );
				} 	
			}
		}

		// Draw water 
		c.fillStyle = "rgba(48, 56, 77, 1)"; //"#30374E";
		c.fillRect(0, canvas.height() - waterLevel, canvas.width(), waterLevel); 

		// Only handle sub display until we are the sub
		if (!player.isSubmarine) {

			// Is it sub time? I think it's sub time.
			canvas.drawSprite(underwater.get("submarine", 1), - 56, 500 - 40);
		
		}

		// Handle sound mixing 
		if (player.onSubmarine) {
			
			gainNode3.gain.value = 0;
			gainNode2.gain.value = 0; 
			gainNode1.gain.value = 1;

		} else if (player.isSubmarine) {
			gainNode3.gain.value = 0;
			gainNode2.gain.value = 1; 
			gainNode1.gain.value = 0; 
		} else if (player.inWater && player.headUnderWater) {
			gainNode3.gain.value = 1;
			gainNode2.gain.value = 0; 
			gainNode1.gain.value = 0; 
		} else {
			gainNode3.gain.value = 0;
			gainNode2.gain.value = 0; 
			gainNode1.gain.value = 1; 
		} 

		// And a pipe. We need a pipe. 
		if (endgame > 100) { 
 			canvas.drawSprite(underwater.get("pipe", 6) , 400, 500 - 24);
		} else {	
 			canvas.drawSprite(underwater.get("pipe", (ticks % 4) +2 ) , 400, 500 - 24);
 		}

 		// Is the pipe colliding with anything 
 		if (collides([400, 500 - (12 * game.scale), game.scale * 12, game.scale * 12], player.bounds())) {

 			// Yes, explain this if not in the end game
 			if (endgame === 0) {
				canvas.drawSprite(ui.get("cause", 1, (player.submarine ? -1 : 0) ), 180, 500 - 20); 
			}
 		}

 		// Is the sub colliding with anything 
 		var tmpSubBounds = [-60, 500 - 40, game.scale * 34, game.scale * 20]; 
 		if (!player.isSubmarine && collides(tmpSubBounds, player.bounds())) {

 			// Sub activated 
 			player.isSubmarine = true; 

 			// Move the player to the same place the sub was 
 			player.position = [-50, 500 - 40];
 		}

		// Show bounds
 		if (debug) { 
			c.strokeStyle = "white";
			c.strokeRect(tmpSubBounds[0] + 0.5, tmpSubBounds[1] + 0.5, tmpSubBounds[2], tmpSubBounds[3]); 
		}

		// Tell the player what keys are being pressed
		player.keys = keys;

		// Let it draw itself - not sure this is a good idea 
		player.draw();

		// Are we in the end game yet? 
		if (Fish.fishKilled > fishBeforeLevel3 && this.fishes.length === 0) { 
			endgame++; 

			// Giant fish comes in
			var giantX; 

			if (waterLevel < 20) {
				player.onSubmarine = true; 
			}

			if (endgame > 200) {
		
				// Drain water!
				waterLevel -= 2;

				// Go back
				giantX = (500 - distanceToPipe) + (endgame - 200); 

			} else if (endgame > distanceToPipe) {
				
				// Drain water!
				waterLevel -= 2;

				// Wait
				giantX = 500 - distanceToPipe;

			} else {

				// Go forward 
				giantX = 500 - endgame; 
			}

			canvas.drawSprite(underwater.get("fish3", 1), giantX, 300);

		} else {

			// If we've killed all the fish we need to, stop spawning fish
			if (Fish.fishKilled <= fishBeforeLevel3) { 

				// If the water is over 80, start spawning fish 
				if (waterLevel > 80) {

					// What are the chances? (somewhere around 1 in 100)
					if (_.random(1, 80) == 1) {
						this.fishes.push(new Fish(canvas));
					}

				}

			}

		}

		// Draw every fish 
		fishCollide = false;  
		this.fishes = _.filter(this.fishes, function(fish) {

			// Check if this fish is colliding with the player 
			var fishBounds = fish.bounds("bitey"); 
			fishCollide = fishCollide || collides(fishBounds, player.bounds());

			// Check if the fish is colliding with any of the players missiles 
			var fishHit = false; 
			fishBounds = fish.bounds(); 
			player.missiles = _.map(player.missiles, function(missile) {
				
				var missileBounds = [missile.position[0] + 6, missile.position[1] + 10, 32, 8];

				if (debug) { 	
					// Show bounds
					c.strokeStyle = "white";
					c.strokeRect(missileBounds[0] + 0.5, missileBounds[1] + 0.5, missileBounds[2], missileBounds[3]); 
				}

				// Tell the missile it hit something 
				if (collides(fishBounds, missileBounds)) {
					missile.hit = true; 
					fishHit = true;
				}

				return missile;

			}); 

			if (fishHit) {
				Fish.fishKilled++;
				fish.die(); 
			}

			var keepFish = fish.draw();

			if (debug) { 
		
				// Show bounds
				c.strokeStyle = fishHit ? "red" : "white"; 
				c.strokeRect(fishBounds[0] + 0.5, fishBounds[1] + 0.5, fishBounds[2], fishBounds[3]); 
				c.strokeRect(fishBounds[0] + 1.5, fishBounds[1] + 1.5, 1, 1); 

				fishBounds = fish.bounds("bitey"); 

				// Show bounds
				c.strokeStyle = "yellow"; 
				c.strokeRect(fishBounds[0] + 0.5, fishBounds[1] + 0.5, fishBounds[2], fishBounds[3]); 
				c.strokeRect(fishBounds[0] + 1.5, fishBounds[1] + 1.5, 1, 1); 

			}


			return keepFish; 
		});

		// Are we being eaten by a fish?
		if (fishCollide) {
			player.hitByFish = true; 
		}

		// UI 
		var healthX = 10; 
		for (var healthNumber = 0; healthNumber < player.maxHealth; healthNumber++) { 

			if (player.health > healthNumber) {
				canvas.drawSprite(ui.get("heart", 1), healthX, 10);
			} else { 
				canvas.drawSprite(ui.get("heart", 2), healthX, 10);
			}

			healthX += 9 * game.scale; 
		}

		var layoutX = healthX + 12; 
		var layoutY = 10; 
		canvas.drawSprite(ui.get("score", 1), layoutX, layoutY);

		layoutX += 90;

		var fishText = Fish.fishKilled + "";
		_.each(fishText.split(""), function(number) {
			
			var sprite = parseInt(number);
			sprite = sprite === 0 ? 10 : sprite; 

			canvas.drawSprite(ui.get("numbers", sprite), layoutX, layoutY);

			layoutX += 8;
		}); 

		// Debug code 
		var debugY = 20; 
		var debugOffsetX = layoutX; 

		c.font = "14px Helvetica";

		if (debug) { 
		
			// Show bounds
			var playerBounds = player.bounds(); 
			c.strokeStyle = fishCollide ? "red" : "white"; 
			c.strokeRect(playerBounds[0] + 0.5, playerBounds[1] + 0.5, playerBounds[2], playerBounds[3]); 
			c.strokeRect(playerBounds[0] + 1.5, playerBounds[1] + 1.5, 1, 1); 
		}

		if (debugConsole) {

			c.fillStyle = "rgba(255, 255, 255, 0.5)";
			c.fillText("DmgTyp: " + player.lastDamageCause, debugOffsetX + 150, debugY); 
			c.fillText("FPS: " + Math.round(frames / ((Date.now() - startTime) / 1000)), debugOffsetX + 20, debugY); 
		}	

		// Request the next frame 
		window.requestAnimationFrame(loop);

	}

	window.requestAnimationFrame(function() {
		loop();
	});


	


};
//# sourceMappingURL=index.js.map