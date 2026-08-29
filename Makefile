things_to_generate := src/data/characters.ts src/data/perks.ts

# Plain names work as-is on Arch/Manjaro (pacman -S clang lld).
# On Debian/Ubuntu, override with versioned names if needed, e.g.:
#   make wasm CLANG=clang-18 FUSE_LD=lld-18
CLANG := clang
FUSE_LD := lld

all: $(things_to_generate) wasm
	@echo "Generated all the data"

$(things_to_generate):
	node scripts/generate_map.cjs

wasm: native/cipher.c
	$(CLANG) --target=wasm32 -nostdlib -O2 -Wl,--no-entry -Wl,--export-all -fuse-ld=$(FUSE_LD) -o native/cipher.wasm native/cipher.c
	node scripts/embed_wasm.cjs

clean:
	rm -f -- $(things_to_generate) native/cipher.wasm

re: clean
	$(MAKE) all
