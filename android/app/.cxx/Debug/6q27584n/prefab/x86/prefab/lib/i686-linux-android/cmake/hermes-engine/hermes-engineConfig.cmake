if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/chan/.gradle/caches/8.11.1/transforms/c52526ea4ec442a2c436e30558c55167/transformed/jetified-hermes-android-0.76.7-debug/prefab/modules/libhermes/libs/android.x86/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/chan/.gradle/caches/8.11.1/transforms/c52526ea4ec442a2c436e30558c55167/transformed/jetified-hermes-android-0.76.7-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

