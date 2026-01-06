package expo.modules.stickersmashobjectdetector

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ObjectDetectorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ObjectDetectorModule")

    ViewManager {
      View { context -> 
        ObjectDetectorView(context, appContext) 
      }

      Prop("modelAssetPath") { view: ObjectDetectorView, path: String ->
        view.setModelAssetPath(path)
      }

      Events("onDetectionResult")
    }
  }
}
