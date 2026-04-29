#import "AppDelegate.h"

#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

static BOOL const USE_NATIVE_STARTUP_DIAGNOSTIC = NO;
static UIWindow *diagnosticWindow = nil;

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  if (USE_NATIVE_STARTUP_DIAGNOSTIC) {
    diagnosticWindow = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];

    UIViewController *viewController = [UIViewController new];
    viewController.view.backgroundColor = [UIColor whiteColor];

    UILabel *eyebrowLabel = [[UILabel alloc] init];
    eyebrowLabel.translatesAutoresizingMaskIntoConstraints = NO;
    eyebrowLabel.text = @"Native Startup Diagnostic";
    eyebrowLabel.textAlignment = NSTextAlignmentCenter;
    eyebrowLabel.textColor = [UIColor colorWithRed:0.54 green:0.35 blue:0.0 alpha:1.0];
    eyebrowLabel.font = [UIFont systemFontOfSize:14 weight:UIFontWeightSemibold];

    UILabel *titleLabel = [[UILabel alloc] init];
    titleLabel.translatesAutoresizingMaskIntoConstraints = NO;
    titleLabel.text = @"UIKit rendered before React.";
    titleLabel.textAlignment = NSTextAlignmentCenter;
    titleLabel.textColor = [UIColor blackColor];
    titleLabel.font = [UIFont systemFontOfSize:28 weight:UIFontWeightBold];
    titleLabel.numberOfLines = 0;

    UILabel *bodyLabel = [[UILabel alloc] init];
    bodyLabel.translatesAutoresizingMaskIntoConstraints = NO;
    bodyLabel.text = @"If you can see this screen, native launch is working and the black screen is in the React bridge or JS bundle path.";
    bodyLabel.textAlignment = NSTextAlignmentCenter;
    bodyLabel.textColor = [UIColor darkGrayColor];
    bodyLabel.font = [UIFont systemFontOfSize:17 weight:UIFontWeightRegular];
    bodyLabel.numberOfLines = 0;

    UIStackView *stackView = [[UIStackView alloc] initWithArrangedSubviews:@[
      eyebrowLabel,
      titleLabel,
      bodyLabel
    ]];
    stackView.translatesAutoresizingMaskIntoConstraints = NO;
    stackView.axis = UILayoutConstraintAxisVertical;
    stackView.spacing = 16;
    stackView.alignment = UIStackViewAlignmentFill;

    [viewController.view addSubview:stackView];

    [NSLayoutConstraint activateConstraints:@[
      [stackView.leadingAnchor constraintEqualToAnchor:viewController.view.leadingAnchor constant:24],
      [stackView.trailingAnchor constraintEqualToAnchor:viewController.view.trailingAnchor constant:-24],
      [stackView.centerYAnchor constraintEqualToAnchor:viewController.view.centerYAnchor]
    ]];

    diagnosticWindow.rootViewController = viewController;
    [diagnosticWindow makeKeyAndVisible];

    NSLog(@"[Native Startup Diagnostic] Presented native-only diagnostic screen");
    return YES;
  }

  self.dependencyProvider = [RCTAppDependencyProvider new];
  self.moduleName = @"main";
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  return [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}

@end
