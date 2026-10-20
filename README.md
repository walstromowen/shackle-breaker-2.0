Volume settings + sound-effect loudness matching
=================================================
Copy the frontend/ folder over your project (7 files; 2 are new).

What changed
- core/audioManager.js        every sound effect is measured the first time it plays and brought to the same loudness (battle cries
                              varied by 18 dB between creatures; now within about 2 dB, and none can clip). Four volume channels
                              (Master / Music / Effects / Ambience) with their levels kept in this browser (localStorage).
                              The slider defaults (Master 100, Music 50, Effects 50, Ambience 50) give the same music, ambience
                              and interface levels as before; effects come out about 6 dB quieter against the music than the old cries did.
- controllers/settings/settingsController.js, renderers/settings/settingsRenderer.js   NEW  the Settings screen.
- core/sceneManager.js        registers the 'settings' scene.
- controllers/title/titleController.js   the title screen's Settings button now opens it.
- controllers/saves/savesController.js, renderers/saves/savesRenderer.js   a Settings button on the in-game System screen
                              (between Back and Quit to Title); Done / Esc returns there.

Using it: drag or click a bar, or Up/Down to pick a row and Left/Right to move it 5%. Test Sound plays a battle cry through
the Effects slider. Reset restores the defaults.

To change the overall loudness of effects against the music for everyone, edit SFX_TARGET_RMS at the top of audioManager.js
(0.18 now; lower is quieter, 0.13 is about 3 dB down).
