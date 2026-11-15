@echo off
rem House Wishlist - opens everything needed to install the Chrome extension.
rem 1) the guide, 2) Chrome's Extensions page, 3) the folder to drag into Chrome.
cd /d "%~dp0"
start "" "%~dp0Installa House Wishlist.html"
start "" chrome "chrome://extensions"
explorer /select,"%~dp0casa-extension"
