cmake_minimum_required(VERSION 3.16)
project(runner_core VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

# Hot-path math library: closed-form jump kinematics + coin splines.
add_library(runner_core
  src/jump_solver.cpp
  src/coin_spline.cpp
)
target_include_directories(runner_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

if(MSVC)
  target_compile_options(runner_core PRIVATE /W4 /O2)
else()
  target_compile_options(runner_core PRIVATE -Wall -Wextra -O2)
endif()

# Benchmark/demo binary: prints solver values for the game's constants and
# times 1,000,000 spline samples.
add_executable(runner_bench src/bench_main.cpp)
target_link_libraries(runner_bench PRIVATE runner_core)

if(MSVC)
  target_compile_options(runner_bench PRIVATE /W4 /O2)
else()
  target_compile_options(runner_bench PRIVATE -Wall -Wextra -O2)
endif()

# Ready for future unit tests; runner_bench doubles as a smoke check.
enable_testing()
