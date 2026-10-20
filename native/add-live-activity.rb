# Adds the Dynamic Island / Live Activity widget to the iOS project that "npx cap add ios" just created.
# Run from the repo root, after "npx cap sync ios":  ruby native/add-live-activity.rb
require 'xcodeproj'
require 'fileutils'

ROOT = File.expand_path('..', __dir__)
IOS = File.join(ROOT, 'ios', 'App')
EXT_NAME = 'LiveWidget'
EXT_BUNDLE = 'com.omarraslan.unimate.LiveWidget'
DEPLOYMENT = '16.2'

project = Xcodeproj::Project.open(File.join(IOS, 'App.xcodeproj'))
app = project.targets.find { |t| t.name == 'App' } or abort('App target not found')
abort('Widget already added') if project.targets.any? { |t| t.name == EXT_NAME }

# 1. put the widget's files next to the app
ext_dir = File.join(IOS, EXT_NAME)
FileUtils.mkdir_p(ext_dir)
FileUtils.cp(File.join(ROOT, 'native/live-widget/UniMateLiveWidget.swift'), ext_dir)
FileUtils.cp(File.join(ROOT, 'native/live-widget/Info.plist'), ext_dir)
FileUtils.cp(File.join(ROOT, 'native/unimate-live/ios/Sources/UnimateLivePlugin/LiveAttributes.swift'), ext_dir)

# 2. the extension target
ext = project.new_target(:app_extension, EXT_NAME, :ios, DEPLOYMENT, nil, :swift)
group = project.main_group.new_group(EXT_NAME, EXT_NAME)
sources = %w[UniMateLiveWidget.swift LiveAttributes.swift].map { |f| group.new_file(f) }
group.new_file('Info.plist')
ext.add_file_references(sources)

app_settings = app.build_configurations.first.build_settings
ext.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = EXT_BUNDLE
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['INFOPLIST_FILE'] = "#{EXT_NAME}/Info.plist"
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT
  s['SKIP_INSTALL'] = 'YES'
  s['MARKETING_VERSION'] = app_settings['MARKETING_VERSION'] || '1.0'
  s['CURRENT_PROJECT_VERSION'] = app_settings['CURRENT_PROJECT_VERSION'] || '1'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
end
begin
  ext.add_system_framework(%w[WidgetKit SwiftUI ActivityKit])
rescue StandardError => e
  puts "note: could not list system frameworks (#{e.message}); Swift links them on its own"
end

# 3. make the app build the widget and carry it inside (Embed Foundation Extensions)
app.add_dependency(ext)
embed = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
embed.name = 'Embed Foundation Extensions'
embed.symbol_dst_subfolder_spec = :plug_ins
build_file = embed.add_file_reference(ext.product_reference, true)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
# before the CocoaPods script phases, otherwise Xcode can report a build cycle
spot = app.build_phases.index { |p| p.isa == 'PBXResourcesBuildPhase' }
spot ? app.build_phases.insert(spot + 1, embed) : app.build_phases << embed

project.save
puts "Added #{EXT_NAME} (#{EXT_BUNDLE}) to the iOS project."
