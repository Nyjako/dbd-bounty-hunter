things_to_generate := src/data/characters.ts src/data/perks.ts

all: $(things_to_generate)
	@echo "Generated all the data"

$(things_to_generate):
	node scripts/generate_map.cjs

clean:
	rm -f -- $(things_to_generate)

re: clean
	$(MAKE) all
