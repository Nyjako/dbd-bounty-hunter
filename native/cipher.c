/*
 * Byte cipher compiled to WebAssembly for save/export obfuscation.
 *
 * Nothing that ships entirely to the browser can be real cryptographic
 * security -- the key below is baked into this compiled module the same
 * way it would be baked into JS. Compiling it to WASM does not create a
 * secret; it raises the bar against *casual* inspection, since reading
 * it back out means disassembling WASM bytecode instead of reading
 * plain-text source.
 */

#define GOBLIN_FNV1A_IMPLEMENTATION
#include "goblin/fnv1a.h"

#define BUF_SIZE 262144
static unsigned char buffer[BUF_SIZE];

__attribute__((export_name("get_buffer")))
unsigned char *get_buffer(void) {
    return buffer;
}

__attribute__((export_name("buffer_capacity")))
int buffer_capacity(void) {
    return BUF_SIZE;
}

static unsigned int key_words[4] = { 0x9e3779b9u, 0x85ebca6bu, 0xc2b2ae35u, 0x27d4eb2fu };

static unsigned int xorshift32(unsigned int *state) {
    unsigned int x = *state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    *state = x;
    return x;
}

/*
 * XOR stream cipher, keyed by the embedded key words and the buffer
 * length. Symmetric: running it twice with the same length undoes
 * itself, so the same function serves as both encrypt and decrypt.
 */
__attribute__((export_name("cipher")))
void cipher(int len) {
    if (len < 0) return;
    if (len > BUF_SIZE) len = BUF_SIZE;

    unsigned int state = key_words[0] ^ key_words[1] ^ key_words[2] ^ key_words[3] ^ (unsigned int)len;

    /* warm up the generator so the first bytes aren't a trivial function of len */
    xorshift32(&state);
    xorshift32(&state);

    for (int i = 0; i < len; i++) {
        unsigned int r = xorshift32(&state);
        buffer[i] = (unsigned char)(buffer[i] ^ (unsigned char)(r & 0xFF) ^ (unsigned char)((r >> 8) & 0xFF));
    }
}

/*
 * Event-log chain hashing, via GOBLIN's fnv1a (goblin/fnv1a.h).
 * goblin_fnv1a_cstr expects a null-terminated string, so both functions
 * null-terminate the buffer at the given length before hashing rather
 * than assuming the caller already did.
 *
 * hash_a and hash_b together form the same "two independent passes,
 * concatenated" idea as before: goblin's function has no seed
 * parameter, so hash_b hashes the same bytes with one extra marker
 * byte appended instead of a different seed, to still get a
 * meaningfully different second value.
 */
__attribute__((export_name("hash_a")))
unsigned int hash_a(int len) {
    if (len < 0) len = 0;
    if (len >= BUF_SIZE) len = BUF_SIZE - 1;
    buffer[len] = 0;
    return (unsigned int)goblin_fnv1a_cstr((const char *)buffer);
}

__attribute__((export_name("hash_b")))
unsigned int hash_b(int len) {
    if (len < 0) len = 0;
    if (len >= BUF_SIZE - 1) len = BUF_SIZE - 2;
    buffer[len] = 0xA5;
    buffer[len + 1] = 0;
    return (unsigned int)goblin_fnv1a_cstr((const char *)buffer);
}
