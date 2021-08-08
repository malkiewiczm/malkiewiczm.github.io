#/bin/sh

objects='./build/main.o ./build/common.o ./build/shader.o ./build/bezier.o ./build/matrix.o'

echo "
MAKEFLAGS += Rr
CXX := em++
CXXFLAGS := -Wall -Wextra -Wpedantic -Wshadow -std=c++11
OBJECTS := $objects

.PHONY: all clean

all: a.out.js

a.out.js: \$(OBJECTS)
	\$(CXX) \$(OBJECTS)

clean:
	rm -f ./build/*.o a.out.js

./build/%.o: ./src/%.cpp
	\$(CXX) \$(CXXFLAGS) \$< -c -o \$@
" > makefile
for fname in ./src/*.cpp; do
	g++ -MM "$fname" -MT ./build/$(basename "$fname" .cpp).o >> makefile
done
