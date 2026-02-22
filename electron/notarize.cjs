const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== "darwin") {
    console.log("  • Skipping notarization — not macOS");
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log("  • Skipping notarization — credentials not set");
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;
  const appBundleId = context.packager.appInfo.id;

  const maxAttempts = 5;
  const baseDelay = 30000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`  • Notarizing ${appPath} (attempt ${attempt}/${maxAttempts})...`);

      await notarize({
        tool: "notarytool",
        appBundleId,
        appPath,
        appleId,
        appleIdPassword,
        teamId,
      });

      console.log("  • Notarization complete");
      return;
    } catch (error) {
      const isServerError =
        error.message && (error.message.includes("500") || error.message.includes("Internal Server Error"));

      if (isServerError && attempt < maxAttempts) {
        const delay = baseDelay * attempt;
        console.log(`  • Apple returned a server error. Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};
