<div align="center">
  <img src="weekly-commits-logo.png" alt="Weekly Commits Logo" width="120" />
  <h1>Weekly Commits</h1>
  <p><strong>A GNOME Shell extension to visualize your GitHub contributions in the top bar</strong></p>
  
  <img src="screenshot.png" alt="Weekly Commits Extension Screenshot" />
  
  <p>
    <a href="https://extensions.gnome.org/extension/8146/weekly-commits/">
      <img src="https://github.com/andyholmes/gnome-shell-extensions-badge/raw/master/get-it-on-ego.png" alt="Get it on GNOME Extensions" />
    </a>
  </p>
  
  <p>
    <img src="https://img.shields.io/github/license/funinkina/weekly-commits" alt="License" />
    <img src="https://img.shields.io/github/stars/funinkina/weekly-commits" alt="GitHub stars" />
    <img src="https://img.shields.io/github/issues/funinkina/weekly-commits" alt="GitHub issues" />
    <img src="https://img.shields.io/github/last-commit/funinkina/weekly-commits" alt="Last commit" />
    <img src="https://img.shields.io/badge/GNOME%20Shell-46%20|%2047%20|%2048-blue" alt="GNOME Shell Version" />
  </p>
</div>

## 🔥 Features

**Weekly Commits** transforms your GitHub activity into a beautiful visual representation directly in your GNOME Shell top bar. Stay motivated and track your coding consistency at a glance!

### ✨ Core Features
- 📊 **Visual Contribution Calendar**: Seven colorful boxes representing your weekly commit activity
- 🖱️ **Interactive Popup**: Click to see detailed daily commit counts
- ⚙️ **Easy Configuration**: Simple GUI preferences for GitHub credentials and settings
- 🔄 **Auto-sync**: Configurable intervals to keep your data fresh
- 📍 **Flexible Positioning**: Place the widget anywhere on your top bar

### 🎨 Theming & Customization
- **14+ Beautiful Themes**: GitHub, Dracula, Halloween, Panda, Solarized, and more
- **Dual Coloring Modes**: 
  - *Opacity-based*: Subtle transparency effects
  - *Grade-based*: Distinct color intensities
- **Week Start Options**: Choose between Monday or Sunday start
- **Custom Positioning**: Perfect alignment with your workflow

## 🚀 Installation

### Method 1: GNOME Extensions (Recommended)
1. Visit the [GNOME Extensions page](https://extensions.gnome.org/extension/8146/weekly-commits/)
2. Click "Install" and follow the browser prompts
3. Enable the extension in the GNOME Extensions app

### Method 2: Manual Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/funinkina/weekly-commits.git
   ```

2. **Install to extensions directory**:
   ```bash
   mv weekly-commits ~/.local/share/gnome-shell/extensions/weekly-commits@funinkina.is-a.dev
   ```

3. **Restart GNOME Shell**:
   - **X11**: Press `Alt` + `F2`, type `r`, and press `Enter`
   - **Wayland**: Log out and log back in

4. **Enable the extension**:
   ```bash
   gnome-extensions enable weekly-commits@funinkina.is-a.dev
   ```
   
   Or use the GNOME Extensions app

### System Requirements
- GNOME Shell 46, 47, or 48
- Internet connection for GitHub API access

## ⚙️ Configuration

### GitHub Authentication Setup

To start tracking your commits, you'll need to configure your GitHub credentials:

#### Step 1: Generate a Personal Access Token
1. Go to [GitHub Personal Access Tokens](https://github.com/settings/personal-access-tokens/new)
2. Create a **Fine-grained Personal Access Token** with:
   - **Repository Access**: "All repositories" or select specific ones
   - **Permissions**: Read access to repository metadata and contents
3. Copy the generated token

#### Step 2: Configure the Extension
1. Right-click on the Weekly Commits widget in your top bar
2. Select "Preferences" or use the GNOME Extensions app
3. Enter your:
   - **GitHub Username**: Your GitHub account username
   - **Personal Access Token**: The token you generated in Step 1

#### Step 3: Customize Settings (Optional)
- **Update Interval**: How often to refresh data (default: 1 hour)
- **Position**: Where to place the widget in the top bar
- **Theme**: Choose from 14+ beautiful color themes
- **Coloring Mode**: Opacity-based or grade-based visualization
- **Week Start**: Monday or Sunday

### 🔒 Privacy & Security
- Your token is stored locally and only used to fetch your public contribution data
- No data is transmitted to third parties
- The extension only reads your commit history, never modifies anything 

## 🎨 Available Themes

Weekly Commits comes with a variety of beautiful themes to match your desktop:

| Theme | Description |
|-------|-------------|
| **GitHub** | Classic GitHub contribution graph colors |
| **Dracula** | Popular dark theme with purple accents |
| **Halloween** | Spooky orange and black theme |
| **Panda** | Cute panda-inspired green theme |
| **Solarized Dark/Light** | Popular developer color schemes |
| **Blue, Pink, Teal** | Vibrant single-color themes |
| **Sunny, YlGnBu** | Gradient and scientific visualization themes |

## 🛠️ Development & Contributing

### Building from Source
```bash
# Clone the repository
git clone https://github.com/funinkina/weekly-commits.git
cd weekly-commits

# Install to local extensions directory
make install

# Enable the extension
make enable
```

### Contributing
Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Roadmap
- [x] ✅ Settings page for GitHub credentials
- [x] ✅ Automatic data fetching with configurable intervals
- [x] ✅ Customizable top bar positioning
- [x] ✅ Interactive daily commit popup
- [x] ✅ Week start day configuration (Monday/Sunday)
- [x] ✅ Multiple color themes and coloring modes
- [ ] 🔄 Customizable commit view thresholds
- [ ] 🔄 Internationalization and translations
- [ ] 🔄 Support for multiple GitHub accounts
- [ ] 🔄 Additional visualization modes

## 💖 Support the Project

If you find Weekly Commits useful, consider supporting its development:

<div align="center">
  <a href="https://www.buymeacoffee.com/funinkina">
    <img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
  </a>
  <a href="https://github.com/sponsors/funinkina">
    <img src="https://img.shields.io/badge/GitHub%20Sponsors-EA4AAA?style=for-the-badge&logo=github-sponsors&logoColor=white" alt="GitHub Sponsors" />
  </a>
</div>

## 🐛 Troubleshooting

### Common Issues

**Extension not showing commits?**
- Verify your GitHub username is correct
- Ensure your Personal Access Token has proper permissions
- Check your internet connection
- Look for error messages in `journalctl -f` while testing

**Widget not appearing in top bar?**
- Make sure the extension is enabled in GNOME Extensions app
- Try restarting GNOME Shell (`Alt+F2`, type `r`, press Enter on X11)
- Check if the extension is compatible with your GNOME Shell version

**Need help?**
- [Open an issue](https://github.com/funinkina/weekly-commits/issues) on GitHub
- Check existing issues for solutions
- Provide your GNOME Shell version and error logs

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Extension Page**: [GNOME Extensions](https://extensions.gnome.org/extension/8146/weekly-commits/)
- **Source Code**: [GitHub Repository](https://github.com/funinkina/weekly-commits)
- **Bug Reports**: [Issues](https://github.com/funinkina/weekly-commits/issues)
- **Creator & Developer**: [Aryan Kushwaha](https://github.com/funinkina)
- **Developer**: [Aryan Techie](https://github.com/aryan-techie)

---

<div align="center">
  <p><strong>Made with ❤️ for the GNOME community</strong></p>
  

  > **Legal Notice**: This project is not affiliated with or endorsed by GitHub, Inc. or the GNOME Foundation. 
  > The use of the GitHub logo and name is for informational purposes only and does not imply any 
  > endorsement or affiliation with GitHub, Inc. All trademarks and copyrights are the property of their respective owners.
</div>