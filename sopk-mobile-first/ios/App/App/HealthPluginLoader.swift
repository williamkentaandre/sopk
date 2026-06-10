// SPM product is "CapgoCapacitorHealth"; the compilable Swift module is the target name.
import HealthPlugin

/// Sans référence explicite à `HealthPlugin`, le linker peut omettre la classe SPM et
/// `NSClassFromString("HealthPlugin")` échoue dans Capacitor → « Health plugin is not implemented on ios ».
enum HealthPluginLoader {
  static let reference: Any.Type = HealthPlugin.self
}
