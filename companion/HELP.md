# Ecamm Live

Controls [Ecamm Live](https://www.ecamm.com/mac/ecammlive/) on macOS through its Remote Control
API (v4.4). Scenes, overlays, cameras, audio, sound effects, profiles, recording and streaming,
and Ecamm's Zoom integration.

## Setting up

### 1. Pick the machine

Ecamm Live's Remote Control API is on by default — there is nothing to switch on in Ecamm first.

**Ecamm Live binds a new port every time it launches**, so there is no fixed address to type in —
Bonjour is the only way to reach it. Pick your Mac from the **Ecamm Live machine** list, which
shows the Macs that announced themselves on your network. Companion keeps looking for as long as
the settings are open, so machines appear as they announce themselves and there is nothing to
close and reopen. Once connected, this connection follows your Mac to whatever port it lands on
next.

Companion labels each entry with the Bonjour _service_ name, which is the same on every install,
so **the address is what tells two Macs apart**:

```
Ecamm Live Remote (192.168.8.199:59395)
Ecamm Live Remote (2) (192.168.8.118:59089)
```

The "(2)" is assigned by discovery order rather than by machine, so do not read anything into it.

There is also a **Manual** option in that list, which every Companion Bonjour picker offers. It
means _nothing selected_ here — there is no address to type, because the port changes on every
launch — and the connection reports a configuration error until you pick a machine.

If a machine you saved is switched off, it shows as `*Unavailable* (192.168.8.199:59395)`. That is
not an error: the setting is remembered and the connection recovers on its own when the Mac and
Ecamm are back.

**The list is exactly what Bonjour announced — nothing more.** It is not a scan of every IP
address a Mac happens to have. A Mac with several interfaces appears once per announced address,
so you can choose which one to use; but if the address you want is missing, it was not announced.
Turn off the interfaces you do not want on the Mac running Ecamm Live, so the address you do want
is the one that gets advertised.

Once connected, `$(ecamm-live:host)` reports the address the connection actually settled on, which
is the reliable way to confirm you are talking to the machine you meant.

### 2. Approve Companion

The first time Companion contacts Ecamm Live, it appears in **Ecamm Live → Settings → Remote
Control** as a pending client named **Bitfocus Companion**. **You must approve it there.**

Until you do, Ecamm refuses every request. Companion shows _"Waiting for approval"_ while this
is the case, and connects on its own within a couple of seconds of you approving it — you do not
need to come back and restart anything.

There is also a **Waiting to be approved in Ecamm Live** feedback, which is worth putting on a
button if you set up Companion and Ecamm on different desks.

## Things worth knowing

### Ecamm's port changes when it restarts

**This is handled for you.** While disconnected, the module looks for your Mac every ten seconds
and follows it to its new port, so reopening Ecamm reconnects on its own without touching the
settings. It follows the address you picked, and on its first successful connection it also notes which
machine that is — so it can find your Mac again even if its IP address has changed as well. It
will not connect to a different Mac by mistake, and it stays on the network interface you
originally picked.

### Overlays are only visible for the current scene

Ecamm can only report the overlays belonging to the scene that is **currently live** — there is
no way to ask about any other scene. This has two consequences:

- The overlay dropdown changes as you switch scenes.
- The **Overlay is visible** feedback can only tell the truth about the live scene. For an
  overlay in any other scene, its state is genuinely unknown, and the feedback shows it as off
  by default. You can change that per-button.

Buttons still work fine for overlays in other scenes: the overlay's id is saved on the button and
Ecamm resolves it even when it is not in the current list. The dropdown shows the raw id while
that scene is away and goes back to showing the overlay's name when it returns. Only the
_feedback_ is limited.

The same applies to the **Overlays - Fixed** presets: that category only ever lists the live
scene's overlays and is rebuilt every time the scene changes, but a button you have already
dragged onto a page keeps the id it was given and carries on working.

When **Companion** switches the scene, the overlay list and the overlay slot variables are
re-read immediately, so they are correct as soon as the scene lands rather than up to a poll
interval later. A scene changed **inside Ecamm** is noticed on the next poll instead, so those
can lag by up to the poll interval.

### What Ecamm cannot tell us

The v4.4 API has no way to report these, so this module does not pretend to:

- **Which camera is live.** There is a _default_ camera feedback, which is a different thing.
- **Whether PIP is showing.** `setPIP` is a toggle with no matching status.
- **Recording or streaming state directly.** The only signal is the wording of Ecamm's own start
  button, so **Recording or streaming** is inferred from that label. If your Ecamm uses different
  wording, use **Start button label contains** instead and match on whatever it actually says.
- **The current profile**, and **which sound effect is playing**.

### Numbered slot variables

Every list Ecamm exposes is also published as a fixed set of numbered variables, so you can build
one generic button and point it at a position rather than at a particular item:

| Variables                                                       | Slots |
| --------------------------------------------------------------- | ----- |
| `scene_001_name` / `scene_001_uuid`                             | 300   |
| `overlay_001_name` / `overlay_001_uuid` / `overlay_001_visible` | 100   |
| `sound_001_name` / `sound_001_uuid`                             | 100   |
| `sound_folder_001_name` / `sound_folder_001_uuid`               | 20    |
| `camera_001_name` / `camera_001_uuid`                           | 50    |
| `profile_001_name` / `profile_001_uuid`                         | 20    |

The slots always exist, even beyond what your machine currently has, and unused ones are empty.
That means a button built on `scene_250_uuid` never errors — it simply does nothing until a 250th
scene exists, then starts working.

**What these are for is not having to build a button per item.** One slot button follows whatever
is in that position in Ecamm, so a row of eight of them covers your first eight scenes whatever
they happen to be, and re-labels itself when you reorder them. They do not give you any reach into
a scene that is not live — an overlay in another scene is still something Ecamm will not report
on, as described above.

To drive an action or feedback from one of these, tick **Use variable** on it. That swaps the
dropdown for a text box, because Companion substitutes variables in text fields only — never in a
dropdown. Then enter something like `$(ecamm-live:scene_001_uuid)`.

The **- Dynamic** presets are already built this way, so they are a good place to look at a
working example.

### Two kinds of preset

Every list Ecamm exposes gets two categories of ready-made button, and it is worth knowing which
one you are dragging out.

**Scenes - Fixed**, **Overlays - Fixed**, **Sounds - Fixed**, **Sound folders - Fixed**,
**Cameras - Fixed** and **Profiles - Fixed** give you one button per item your Mac actually has
right now, with the item's name printed on it and its id baked in. They appear only once Ecamm has
answered, and the list follows whatever you add or remove in Ecamm. Reach for these when your show
is settled and you want buttons that read correctly at a glance.

**Scenes 001-050 - Dynamic** and the rest give you one button per numbered slot, driven by the
slot variables above. They are always there, even with nothing connected, and each one follows
whatever is in that position. Reach for these when you want a wall of buttons that re-points
itself as the lists change.

The Dynamic categories stop earlier than the variables do — 100 scenes, 50 overlays and 20
cameras, against the full slot counts in the table above. That is only about how many buttons are
pre-built for you: if you have a bigger Ecamm profile, every slot variable still exists, so you can
build the button yourself with **Use variable** and `$(ecamm-live:scene_150_uuid)`.

### Sound effect folders

Sound effects grouped into a folder in Ecamm are handled as folders, not as sounds:

- Sounds inside a folder appear in the sound dropdown as **`Folder / Sound`**.
- The folder itself is not one of them — it has its own action, **Sound: Play sound folder**,
  with its own dropdown, which plays the whole folder as a unit.

### Audio buses

Ecamm's status payload includes every audio bus a given Mac actually has — typically the mic,
movie, sound effects and Zoom. The Zoom and Interview **guest** buses appear in it as soon as a
guest is connected, and disappear again when they leave, so `$(ecamm-live:volume_guest_1)` starts
working on its own the moment there is a guest 1 to report.

Variables for a bus this Mac does not have stay empty rather than showing a misleading `0`, and
its **Audio bus is muted** feedback stays dark rather than claiming the bus is live.

### Polling

Ecamm asks not to be polled faster than every 2 seconds, so that is both the default and the
minimum this module will accept. Pressing a button triggers a slightly earlier refresh so the
button updates promptly, but never faster than that floor.
