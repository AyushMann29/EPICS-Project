package expo.modules.stickersmashobjectdetector

import android.content.Context
import android.util.Log
import android.widget.FrameLayout
import androidx.camera.core.AspectRatio
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import com.google.mediapipe.framework.image.MediaImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetectorResult
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ObjectDetectorView(context: Context, appContext: AppContext) : ExpoView(context, appContext), LifecycleOwner {
    private val onDetectionResult by EventDispatcher()
    private var previewView: PreviewView = PreviewView(context)
    private var objectDetector: ObjectDetector? = null
    private var backgroundExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val lifecycleRegistry = LifecycleRegistry(this)
    private var modelAssetPath: String? = null

    init {
        addView(previewView)
        lifecycleRegistry.currentState = Lifecycle.State.CREATED
    }

    fun setModelAssetPath(path: String) {
        this.modelAssetPath = path
        setupObjectDetector()
        startCamera()
    }

    private fun setupObjectDetector() {
        val path = modelAssetPath ?: return
        
        val baseOptionsBuilder = BaseOptions.builder().setModelAssetPath(path)
        val optionsBuilder = ObjectDetector.ObjectDetectorOptions.builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setRunningMode(RunningMode.LIVE_STREAM)
            .setResultListener(this::returnLivestreamResult)
            .setErrorListener(this::returnLivestreamError)
            
        try {
            objectDetector = ObjectDetector.createFromOptions(context, optionsBuilder.build())
        } catch (e: Exception) {
            Log.e("ObjectDetector", "TFLite failed to load model with error: " + e.message)
        }
    }

    private fun returnLivestreamResult(result: ObjectDetectorResult, input: com.google.mediapipe.framework.image.MPImage) {
        val detections = result.detections().map { detection ->
            mapOf(
                "categories" to detection.categories().map { category ->
                    mapOf(
                        "score" to category.score(),
                        "categoryName" to category.categoryName()
                    )
                },
                "boundingBox" to mapOf(
                    "originX" to detection.boundingBox().left,
                    "originY" to detection.boundingBox().top,
                    "width" to detection.boundingBox().width(),
                    "height" to detection.boundingBox().height()
                )
            )
        }
        
        onDetectionResult(mapOf("detections" to detections))
    }

    private fun returnLivestreamError(error: RuntimeException) {
        Log.e("ObjectDetector", error.message ?: "Unknown error")
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder()
                .setTargetAspectRatio(AspectRatio.RATIO_4_3)
                .build()
                .also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

            val imageAnalyzer = ImageAnalysis.Builder()
                .setTargetAspectRatio(AspectRatio.RATIO_4_3)
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                .build()
                .also {
                    it.setAnalyzer(backgroundExecutor) { imageProxy ->
                        detectLivestreamFrame(imageProxy)
                    }
                }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalyzer
                )
            } catch (exc: Exception) {
                Log.e("ObjectDetector", "Use case binding failed", exc)
            }
        }, ContextCompat.getMainExecutor(context))
    }

    private fun detectLivestreamFrame(imageProxy: ImageProxy) {
        if (objectDetector == null) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val imageProcessingOptions = com.google.mediapipe.tasks.vision.core.ImageProcessingOptions.builder()
                .setRotationDegrees(imageProxy.imageInfo.rotationDegrees)
                .build()
            
            val mpImage = MediaImageBuilder(mediaImage).build()
            objectDetector?.detectAsync(mpImage, imageProcessingOptions, System.currentTimeMillis())
        }
        
        imageProxy.close()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        lifecycleRegistry.currentState = Lifecycle.State.STARTED
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        lifecycleRegistry.currentState = Lifecycle.State.DESTROYED
        backgroundExecutor.shutdown()
    }

    override fun getLifecycle(): Lifecycle {
        return lifecycleRegistry
    }
}
