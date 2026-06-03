UUID = weekly-commits@funinkina.is-a.dev
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
SCHEMA_DIR = $(INSTALL_DIR)/schemas
SCHEMA_SRC = schemas/org.gnome.shell.extensions.weekly-commits.gschema.xml
SYSTEM_SCHEMA_DIR = /usr/share/glib-2.0/schemas

PACK_NAME = $(UUID).zip
PACK_FILES = extension.js prefs.js metadata.json helpers schemas

.PHONY: all install uninstall pack clean enable disable

all: pack

install:
	mkdir -p $(INSTALL_DIR)
	cp -r $(PACK_FILES) $(INSTALL_DIR)/
	glib-compile-schemas $(SCHEMA_DIR)
	@echo "Installed to $(INSTALL_DIR)"
	@echo "Restart GNOME Shell or log out/in to activate"

uninstall:
	rm -rf $(INSTALL_DIR)
	@echo "Uninstalled $(UUID)"

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

pack: clean-pack
	mkdir -p _pack
	cp -r $(PACK_FILES) _pack/
	glib-compile-schemas _pack/schemas
	cd _pack && zip -r ../$(PACK_NAME) .
	rm -rf _pack
	@echo "Packaged: $(PACK_NAME)"

clean-pack:
	rm -rf _pack $(PACK_NAME)

clean: clean-pack
