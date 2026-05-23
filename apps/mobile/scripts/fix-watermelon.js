const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');

// Fix 1: app/build.gradle
const buildGradle = path.join(androidDir, 'app', 'build.gradle');
let buildContent = fs.readFileSync(buildGradle, 'utf8');
buildContent = buildContent.replace(
  "implementation project(':watermelondb-jsi')",
  "implementation project(':watermelondb')"
);
fs.writeFileSync(buildGradle, buildContent);
console.log('✓ Fixed app/build.gradle');

// Fix 2: settings.gradle
const settingsGradle = path.join(androidDir, 'settings.gradle');
let settingsContent = fs.readFileSync(settingsGradle, 'utf8');
settingsContent = settingsContent.replace(
  `include ':watermelondb-jsi'
          project(':watermelondb-jsi').projectDir = new File([
              "node", "--print", 
              "require.resolve('@nozbe/watermelondb/package.json')"
          ].execute(null, rootProject.projectDir).text.trim(), "../native/android-jsi")`,
  `include ':watermelondb'
          project(':watermelondb').projectDir = new File([
              "node", "--print", 
              "require.resolve('@nozbe/watermelondb/package.json')"
          ].execute(null, rootProject.projectDir).text.trim(), "../native/android")`
);
fs.writeFileSync(settingsGradle, settingsContent);
console.log('✓ Fixed settings.gradle');

// Fix 3: MainApplication.kt
const mainApp = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'anonymous', 'mobile', 'MainApplication.kt');
let mainContent = fs.readFileSync(mainApp, 'utf8');
mainContent = mainContent
  .replace(
    'import com.nozbe.watermelondb.jsi.WatermelonDBJSIPackage;',
    'import com.nozbe.watermelondb.WatermelonDBPackage'
  )
  .replace(
    'add(WatermelonDBJSIPackage())',
    'add(WatermelonDBPackage())'
  );
fs.writeFileSync(mainApp, mainContent);
console.log('✓ Fixed MainApplication.kt');

console.log('\nAll watermelon fixes applied successfully.');