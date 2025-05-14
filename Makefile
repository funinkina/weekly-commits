.PHONY: all clean install uninstall

EXTENSION_UUID = weekly-commits@funinkina.is-a.dev
SCHEMA_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)/schemas

all: schemas

schemas:
    @mkdir -p schemas
    glib-compile-schemas schemas/

clean:
    rm -f schemas/gschemas.compiled

install: all
    @mkdir -p $(SCHEMA_DIR)
    cp schemas/*.xml $(SCHEMA_DIR)
    glib-compile-schemas $(SCHEMA_DIR)

uninstall:
    rm -rf $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)