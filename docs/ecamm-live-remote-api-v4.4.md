# Ecamm Live Remote API v4.4

## Locating the Service

Discover the service via Bonjour:

```objc
searchForServicesOfType:@"_ecammliveremote._tcp." inDomain:@"local."
```

If your client is only intended to run on the same Mac as Ecamm Live, verify after discovery that you found the local host. Otherwise you may discover Ecamm Live running on other Macs.

## Additional HTTP Headers

Send these headers along with your requests:

| Header                 | Value                                                                                                          | Required |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| `User-Agent`           | `[app name]/[app version]`                                                                                     | Yes      |
| `EcammLive-UUID`       | A GUID string, should persist between sessions                                                                 | Yes      |
| `EcammLive-ClientName` | Your app name, for presenting to users                                                                         | Yes      |
| `EcammLive-DeviceName` | If this is an app on a different device, the device's name from `UIDevice.current.name` (e.g. `Gary's iPhone`) | Optional |
| `EcammLive-ClientIcon` | URL of your square-aspect app icon                                                                             | Optional |

## Commands

All requests are HTTP `GET` requests.

- Requests with a **`get`** prefix retrieve information from Ecamm Live and return JSON. Parameters, when needed, are sent URL-encoded in the query string.
- Requests with a **`set`** prefix make changes to Ecamm Live, usually with parameters sent URL-encoded in the query string. They do not return anything but `Done`.

---

## Display Info

### `getInfo`

> **Note:** Although this is a fairly lightweight operation, avoid calling it more frequently than every 2 seconds.

**Returns:** Dictionary containing strings for `ButtonLabel`, `PauseButtonLabel`, `CurrentScene`, `Viewers`, `LiveDemo`, `PreviewMode`, `HidingUI`, mute settings, volume levels, and Zoom/Interview guest names.

If a Zoom meeting is in progress, it also contains yes/no values for: `ZoomInMeeting`, `ZoomMuted`, `ZoomHandRaised`, `ZoomCamOn`, `ZoomCloudRecording`, `ZoomLocalRecording`, `ZoomRecordingPaused`, `ZoomHosting`.

### `getButtonLabel`

**Returns:** Label for Start button. _string_

### `getPauseButtonLabel`

**Returns:** Label for Pause button. _string_

### `setClickButton`

Clicks the start or record button.

| Parameter | Description                                                                                   |
| --------- | --------------------------------------------------------------------------------------------- |
| `channel` | A destination UUID from `getChannels`, or leave out to use the currently scheduled live event |
| `title`   | Title for new live broadcast                                                                  |
| `desc`    | Description for new live broadcast                                                            |

### `setClickPauseButton`

Clicks the pause recording button.

**Parameters:** None

---

## Scenes

### `getSceneList`

**Returns:** An array of Scene info dictionaries.

### `getSceneDict`

**Returns:** A dictionary of Scene info dictionaries.

### `getSceneImage`

| Parameter | Description      |
| --------- | ---------------- |
| `id`      | The Scene's UUID |

**Returns:** `icon` - The Scene's last thumbnail image, as a Base 64 encoded JPG.

### `getCurrentScene`

**Returns:** UUID of the current Scene.

### `setScene`

Switch to a Scene.

| Parameter | Description      |
| --------- | ---------------- |
| `id`      | The Scene's UUID |

### `setNext`

Go to next Scene.

### `setPrev`

Go to previous Scene.

---

## Mute

> **Undocumented `bus` parameter (observed, not documented by Ecamm).** Both commands below accept
> the same `bus` values `setVolume` documents, and each bus mutes independently of the main mute
> this section describes. Verified against a live install: `setMute?bus=soundeffects` flipped only
> `MUTE_SOUNDEFFECTS` in `getInfo`, leaving `Mute`, `MUTE_MIC`, `MUTE_MOVIE` and `MUTE_ZOOM`
> untouched, and `getMute?bus=soundeffects` reported it while a bare `getMute` did not.
>
> Unlike `getVolume`, a bus the machine does not have answers `no` rather than `N/A`, so `getMute`
> cannot tell an absent bus from an unmuted one.

### `getMute`

**Returns:** Mute status (`yes` \| `no`) _string_

| Parameter | Description                                                            |
| --------- | ---------------------------------------------------------------------- |
| `bus`     | _Undocumented._ Audio bus, as for `getVolume`. Omit for the main mute. |

### `setMute`

Toggles mute status.

| Parameter | Description                                                            |
| --------- | ---------------------------------------------------------------------- |
| `bus`     | _Undocumented._ Audio bus, as for `setVolume`. Omit for the main mute. |

---

## Volume

### `getVolume`

**Returns:** Volume level _string_

| Parameter | Description                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bus`     | Audio bus (`mic` \| `mic2` \| `skype` \| `system audio` \| `interview` \| `zoom` \| `soundeffects` \| `movie` \| `guest_1` \| `guest_2` \| `guest_3` \| `guest_4`) |

### `setVolume`

| Parameter | Description                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `volume`  | New volume level _string_                                                                                                                                          |
| `bus`     | Audio bus (`mic` \| `mic2` \| `skype` \| `system audio` \| `interview` \| `zoom` \| `soundeffects` \| `movie` \| `guest_1` \| `guest_2` \| `guest_3` \| `guest_4`) |

---

## Concurrent Viewers

### `getViewers`

**Returns:** Number of concurrent viewers. _string_

---

## Cameras

### `getInputs`

**Returns:** An array of camera inputs.

### `getDefaultCamera`

**Returns:** UUID of the default camera. _string_

### `setInput`

Pick a camera.

| Parameter | Description             |
| --------- | ----------------------- |
| `id`      | UUID of a camera to use |

---

## Source Mode

### `getCurrentMode`

**Returns:** Current source mode (`cam` \| `screen` \| `video`) _string_

### `setMode`

| Parameter | Description                                         |
| --------- | --------------------------------------------------- |
| `mode`    | Mode to use (`cam` \| `screen` \| `video`) _string_ |

---

## PIP

### `setPIP`

Toggle PIP visibility.

---

## Video Playback Mode

### `getVideoList`

**Returns:** An array of recently used video files.

### `getVideoDict`

**Returns:** A dictionary of recently used video files.

### `setVideo`

| Parameter | Description                         |
| --------- | ----------------------------------- |
| `id`      | File path of video to play _string_ |

### `getVideoImage`

| Parameter | Description            |
| --------- | ---------------------- |
| `id`      | A file path to a video |

**Returns:** `icon` - The video's thumbnail image, as a Base 64 encoded JPG.

---

## Overlays

### `getOverlayList`

**Returns:** An array of Overlay info dictionaries.

### `getOverlayDict`

**Returns:** A dictionary of Overlay info dictionaries.

### `getOverlayImage`

| Parameter | Description        |
| --------- | ------------------ |
| `id`      | The Overlay's UUID |

**Returns:** `icon` - The Overlay's thumbnail image, as a Base 64 encoded JPG.

### `setOverlay`

Toggle an overlay's visibility.

| Parameter | Description                  |
| --------- | ---------------------------- |
| `id`      | UUID of the Overlay _string_ |

### `setHideComment`

Hide the most recent comment Overlay.

### `setShowComment`

Show the most recent comment as an Overlay.

---

## Sound Effects

### `getSoundList`

**Returns:** An array of Sound Effect info dictionaries.

### `getSoundDict`

**Returns:** A dictionary of Sound Effect info dictionaries.

### `setSound`

Play a sound.

| Parameter | Description                                                |
| --------- | ---------------------------------------------------------- |
| `id`      | A UUID OR file path to a sound effect _string_             |
| `volume`  | Volume level 0 to 100 _string_                             |
| `action`  | Playback behavior (`stop` \| `loop` \| `restart`) _string_ |

### `setSoundVolume`

Set the volume level of the currently playing sound.

| Parameter | Description                    |
| --------- | ------------------------------ |
| `volume`  | Volume level 0 to 100 _string_ |

### `setSoundStop`

Stop the currently playing sound.

### `setSoundPause`

Pause the currently playing sound.

---

## Audio Filters

### `getAudioFilterList`

**Returns:** An array of Audio Filter info dictionaries.

### `getAudioFilterDict`

**Returns:** A dictionary of Audio Filter info dictionaries.

### `setAudioFilter`

Toggle an audio filter.

| Parameter | Description                        |
| --------- | ---------------------------------- |
| `id`      | A UUID of an audio filter _string_ |

---

## Preview Mode

### `setPreviewMode`

Toggle Preview Mode.

### `setPublish`

Publish Preview Mode.

---

## Profiles

### `getProfileList`

**Returns:** An array of Profile dictionaries.

### `setProfile`

Switches to a new Profile.

| Parameter | Description                      |
| --------- | -------------------------------- |
| `id`      | UUID of the new Profile _string_ |

---

## Ecamm for Zoom

### `setZoomNew`

Starts a new Zoom meeting.

| Parameter | Description                                                                 |
| --------- | --------------------------------------------------------------------------- |
| `pmi`     | _[optional]_ Use Personal Meeting ID `true` \| `false` (defaults to `true`) |

### `setZoomLeave`

Leave the current Zoom meeting.

| Parameter | Description                                                                         |
| --------- | ----------------------------------------------------------------------------------- |
| `end`     | _[optional]_ End meeting for all `true` \| `false` (defaults to `true`) (Host only) |

### `setZoomPanel`

Show/hide a Zoom meeting panel.

| Parameter | Description                                      |
| --------- | ------------------------------------------------ |
| `panel`   | `meeting` \| `chat` \| `participants` \| `share` |

### `setZoomVideo`

Start/stop Zoom video.

### `setZoomAudio`

Mute/unmute Zoom mic audio.

### `setZoomMuteAll`

Mute all participants except host. (Host and co-host only)

### `setZoomRaiseHand`

Raise/lower hand.

### `setZoomFullScreen`

Toggle full screen meeting.

### `setZoomCloudRecord`

Start/stop Zoom cloud recording.

### `setZoomLocalRecord`

Start/stop Zoom local recording.

### `setZoomPauseRecord`

Pause/resume Zoom local or cloud recording.

### `setZoomPrevGallery`

Go to previous Zoom gallery page.

### `setZoomNextGallery`

Go to next Zoom gallery page.

### `setZoomGallerySpeaker`

Switch between Zoom gallery view and speaker view.

### `setSpotlightSelf`

Toggles Zoom spotlighting.

---

## Other

### `getChannels`

**Returns:** A dictionary of streaming destinations, used for `setClickButton`.

### `setComment`

| Parameter | Description                                           |
| --------- | ----------------------------------------------------- |
| `text`    | Comment to post to Twitch, YouTube, or Facebook Pages |

### `setMarker`

| Parameter   | Description                                    |
| ----------- | ---------------------------------------------- |
| `text`      | _[optional]_ Marker text, url-escaped _string_ |
| `dialogbox` | Show marker dialog box `true` \| `false`       |

### `getLiveDemo`

**Returns:** Status of Live Demo Mode (`yes` \| `no`) _string_

### `setLiveDemo`

Toggles Live Demo Mode.

### `getHideShowUI`

**Returns:** Status of on-screen button visibility (`yes` \| `no`) _string_

### `setHideShowUI`

Toggles Hide Main Window Controls feature.

### `getConnectionStatus`

**Returns:** The client's permissions in the receiver's Remote Control permission screen. `Allowed` \| `Denied` \| `Pending` \| `Not Found`

### `setStartNewRecording`

Start a new recording when streaming or recording.
