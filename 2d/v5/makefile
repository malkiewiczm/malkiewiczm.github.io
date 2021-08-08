
MAKEFLAGS += Rr
CXX := em++
CXXFLAGS := -Wall -Wextra -Wpedantic -Wshadow -std=c++11
OBJECTS := ./build/main.o ./build/common.o ./build/shader.o ./build/bezier.o ./build/matrix.o

.PHONY: all clean

all: a.out.js

a.out.js: $(OBJECTS)
	$(CXX) $(OBJECTS)

clean:
	rm -f ./build/*.o a.out.js

./build/%.o: ./src/%.cpp
	$(CXX) $(CXXFLAGS) $< -c -o $@

build/bezier.o: src/bezier.cpp src/bezier.hpp src/common.hpp src/vec3.hpp
build/common.o: src/common.cpp src/common.hpp
build/main.o: src/main.cpp src/common.hpp src/shader.hpp src/matrix.hpp \
 src/vec3.hpp src/bezier.hpp
build/matrix.o: src/matrix.cpp src/matrix.hpp src/vec3.hpp
build/shader.o: src/shader.cpp src/shader.hpp src/common.hpp
