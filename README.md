# Weekly Commits (GNOME extension)

## See your past weeks' GitHub contributions in the top bar
> Make your top bar 42% cooler, one commit at a time.

## Get this extension in GNOME Extensions
> [!NOTE]  
> This extension is not yet available in the GNOME Extensions website. You can install it manually by following the instructions below.

## Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/funinkina/weekly-commits
   ```
2. Move this repository to the GNOME extensions directory:
   ```bash
   mv weekly-commits ~/.local/share/gnome-shell/extensions/
   ```
3. Restart GNOME Shell (press `Alt` + `F2`, type `r`, and press `Enter`) or log out and log back in of you are on Wayland.
   
4. Enable the extension from the GNOME Extenstions app or from the command line:
   ```bash
   gnome-extensions enable weekly-commits@funinkina.is-a.dev
   ```

## Configuration
To make the extension work, you need to set your GitHub username and a personal access token (PAT) with the `repo` scope. 

You can create a PAT in your GitHub account settings under [Developer settings](https://github.com/settings/tokens).

And put your GitHub username and PAT in the extension's settings. 

## TODO
- [x] Add a settings page to configure the GitHub username and PAT.
- [ ] Enable the extension to work with multiple GitHub accounts.
- [x] Make it fetch the commits at some interval (e.g. every hour).
- [ ] Let users configure the placement in the top bar.
- [ ] Customisable commit thresholds.
- [ ] Add a tooltip with the number of commits and the date range.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.