UI overhaul: the login screen's look on every screen, no selection brackets, Back buttons
=========================================================================================
Copy the frontend/ folder over your project. This REPLACES text_standard.zip and sleek_modern.zip (it contains everything in them,
plus today's work, merged onto your current main), and it includes the Settings screen / volume work from volume_settings.zip.
Fonts: frontend/src/assets/fonts (Cormorant Garamond, Barlow, DM Mono; licences in LICENSES.txt) are needed.

What changed
- Same look as the login card everywhere: cool blue-black plates with a brass hairline and cut corners, Cormorant Garamond titles,
  Barlow text, tracked-capital buttons with the login button's brass-tinted face.
- The corner brackets are gone from every screen. The item under the mouse or keyboard cursor now shows a gold wash, a fine edge and a
  brass bar on its left edge (a chosen item keeps the pale bar). Key hints read "R-Click/ESC: Back" instead of "[R-Click/ESC] Back".
  In the overworld, the object you can interact with gets a soft pulsing brass outline instead of brackets.
- A standard Back button (300x76, same as the one on the Save screen) on Party, Character, Journal, Crafting Bag, Shop and the
  Character Creator. Clicking it does exactly what right-click does there (closes a menu first, then leaves). The Settings
  screen's Done button is now Back too. Right-click and Esc still work everywhere.
  Where each one sits is in SHARED_BACK_BUTTON at the top of core/sceneManager.js; its look is UITheme.backButton / UITheme.button.

Notes
- The Journal panels and the Crafting Bag recipe list are a little shorter to make room for the Back button.
- The Character screen's key hints moved to the right of its Back button.
