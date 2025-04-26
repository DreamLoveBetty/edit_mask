"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Brush, Eraser, Layers, Download, RefreshCw } from "lucide-react"

export function ImageMaskEditor() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [maskOpacity, setMaskOpacity] = useState([50])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawMode, setDrawMode] = useState<"brush" | "eraser">("brush")
  const [brushSize, setBrushSize] = useState([20])
  const [separatedLayers, setSeparatedLayers] = useState<{
    original: string | null
    mask: string | null
  }>({ original: null, mask: null })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 初始化画布
  useEffect(() => {
    if (originalImage && canvasRef.current && maskCanvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      const maskCanvas = maskCanvasRef.current
      const maskCtx = maskCanvas.getContext("2d")

      if (ctx && maskCtx) {
        // 设置画布尺寸
        canvas.width = originalImage.width
        canvas.height = originalImage.height
        maskCanvas.width = originalImage.width
        maskCanvas.height = originalImage.height

        // 绘制原始图像
        ctx.drawImage(originalImage, 0, 0)

        // 清除遮罩画布
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      }
    }
  }, [originalImage])

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          setOriginalImage(img)
          setSeparatedLayers({ original: null, mask: null })
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvasRef.current) return

    setIsDrawing(true)
    const maskCtx = maskCanvasRef.current.getContext("2d")
    if (maskCtx) {
      const rect = maskCanvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (maskCanvasRef.current.width / rect.width)
      const y = (e.clientY - rect.top) * (maskCanvasRef.current.height / rect.height)

      maskCtx.beginPath()
      maskCtx.moveTo(x, y)

      // 设置绘制样式
      maskCtx.lineWidth = brushSize[0]
      maskCtx.lineCap = "round"
      maskCtx.lineJoin = "round"

      if (drawMode === "brush") {
        maskCtx.globalCompositeOperation = "source-over"
        maskCtx.strokeStyle = "white"
      } else {
        maskCtx.globalCompositeOperation = "destination-out"
      }

      drawMaskOnMainCanvas()
    }
  }

  // 处理鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return

    const maskCtx = maskCanvasRef.current.getContext("2d")
    if (maskCtx) {
      const rect = maskCanvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (maskCanvasRef.current.width / rect.width)
      const y = (e.clientY - rect.top) * (maskCanvasRef.current.height / rect.height)

      maskCtx.lineTo(x, y)
      maskCtx.stroke()

      drawMaskOnMainCanvas()
    }
  }

  // 处理鼠标抬起事件
  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  // 在主画布上绘制带有遮罩的图像
  const drawMaskOnMainCanvas = () => {
    if (!canvasRef.current || !maskCanvasRef.current || !originalImage) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    const maskCanvas = maskCanvasRef.current
    const maskCtx = maskCanvas.getContext("2d")

    if (ctx && maskCtx) {
      // 清除主画布
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 绘制原始图像
      ctx.drawImage(originalImage, 0, 0)

      // 绘制遮罩
      ctx.save()
      ctx.globalAlpha = maskOpacity[0] / 100
      ctx.drawImage(maskCanvas, 0, 0)
      ctx.restore()
    }
  }

  // 分离图层
  const separateLayers = () => {
    if (!canvasRef.current || !maskCanvasRef.current || !originalImage) return

    // 获取原始图层
    const originalCanvas = document.createElement("canvas")
    originalCanvas.width = originalImage.width
    originalCanvas.height = originalImage.height
    const originalCtx = originalCanvas.getContext("2d")
    if (originalCtx) {
      originalCtx.drawImage(originalImage, 0, 0)
    }

    // 获取遮罩图层
    const maskCanvas = maskCanvasRef.current

    // 获取当前带遮罩的图像
    const maskedImage = canvasRef.current.toDataURL("image/png")

    setSeparatedLayers({
      original: originalCanvas.toDataURL("image/png"),
      mask: maskCanvas.toDataURL("image/png"),
    })
  }

  // 合成并保存带遮罩的图像
  const saveMaskedImage = () => {
    if (!canvasRef.current || !originalImage) return

    // 获取当前画布上的图像（已经包含了遮罩）
    const dataUrl = canvasRef.current.toDataURL("image/png")

    // 下载图像
    downloadLayer(dataUrl, "masked-image.png")
  }

  // 将遮罩保存为透明通道（保留所有图像信息）
  const saveMaskedImageWithTransparency = () => {
    if (!canvasRef.current || !maskCanvasRef.current || !originalImage) return

    // 创建一个新的画布用于合成
    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = originalImage.width
    exportCanvas.height = originalImage.height
    const exportCtx = exportCanvas.getContext("2d")

    if (exportCtx) {
      // 绘制原始图像
      exportCtx.drawImage(originalImage, 0, 0)

      // 获取遮罩数据
      const maskCtx = maskCanvasRef.current.getContext("2d")
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
        const originalData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height)

        // 将遮罩数据应用到原始图像的Alpha通道，但保留非遮罩区域的图像信息
        for (let i = 0; i < maskData.data.length; i += 4) {
          // 计算遮罩值（白色为255，黑色为0）
          const maskValue = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3

          // 设置Alpha通道：
          // - 遮罩区域（白色）设为完全不透明（255）
          // - 非遮罩区域设为半透明（128），而不是完全透明（0）
          // 这样可以在其他应用中仍然区分遮罩区域，同时保留所有图像信息
          originalData.data[i + 3] = maskValue > 128 ? 255 : 128
        }

        // 将处理后的数据放回画布
        exportCtx.putImageData(originalData, 0, 0)

        // 导出为PNG（保留透明度）
        const dataUrl = exportCanvas.toDataURL("image/png")
        downloadLayer(dataUrl, "transparent-masked-image.png")
      }
    }
  }

  const saveMaskedImageWithCustomTransparency = () => {
    if (!canvasRef.current || !maskCanvasRef.current || !originalImage) return

    // 创建一个新的画布用于合成
    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = originalImage.width
    exportCanvas.height = originalImage.height
    const exportCtx = exportCanvas.getContext("2d")

    if (exportCtx) {
      // 绘制原始图像
      exportCtx.drawImage(originalImage, 0, 0)

      // 获取遮罩数据
      const maskCtx = maskCanvasRef.current.getContext("2d")
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
        const originalData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height)

        // 提示用户输入非遮罩区域的透明度
        const nonMaskOpacity = prompt("请输入非遮罩区域的透明度（0-255，0为完全透明，255为完全不透明）:", "128")
        const opacity = nonMaskOpacity ? Number.parseInt(nonMaskOpacity, 10) : 128
        const validOpacity = Math.max(0, Math.min(255, opacity)) // 确保值在0-255范围内

        // 将遮罩数据应用到原始图像的Alpha通道
        for (let i = 0; i < maskData.data.length; i += 4) {
          const maskValue = (maskData.data[i] + maskData.data[i + 1] + maskData.data[i + 2]) / 3
          // 遮罩区域完全不透明，非遮罩区域使用用户指定的透明度
          originalData.data[i + 3] = maskValue > 128 ? 255 : validOpacity
        }

        // 将处理后的数据放回画布
        exportCtx.putImageData(originalData, 0, 0)

        // 导出为PNG（保留透明度）
        const dataUrl = exportCanvas.toDataURL("image/png")
        downloadLayer(dataUrl, `transparent-masked-image-${validOpacity}.png`)
      }
    }
  }

  // 清除遮罩
  const clearMask = () => {
    if (!maskCanvasRef.current || !canvasRef.current || !originalImage) return

    const maskCtx = maskCanvasRef.current.getContext("2d")
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)

      // 重绘主画布
      const ctx = canvasRef.current.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.drawImage(originalImage, 0, 0)
      }

      setSeparatedLayers({ original: null, mask: null })
    }
  }

  // 下载图层
  const downloadLayer = (dataUrl: string, filename: string) => {
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 监听透明度变化
  useEffect(() => {
    drawMaskOnMainCanvas()
  }, [maskOpacity])

  return (
    <div className="flex flex-col gap-6">
      {/* 上传区域 */}
      {!originalImage && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">上传图片</h3>
          <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF 最大 10MB</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {/* 编辑区域 */}
      {originalImage && (
        <>
          <div className="flex flex-wrap gap-4 mb-4">
            <Button
              variant={drawMode === "brush" ? "default" : "outline"}
              size="sm"
              onClick={() => setDrawMode("brush")}
            >
              <Brush className="mr-2 h-4 w-4" /> 绘制遮罩
            </Button>
            <Button
              variant={drawMode === "eraser" ? "default" : "outline"}
              size="sm"
              onClick={() => setDrawMode("eraser")}
            >
              <Eraser className="mr-2 h-4 w-4" /> 橡皮擦
            </Button>
            <Button variant="outline" size="sm" onClick={clearMask}>
              <RefreshCw className="mr-2 h-4 w-4" /> 清除遮罩
            </Button>
            <Button variant="default" size="sm" onClick={separateLayers}>
              <Layers className="mr-2 h-4 w-4" /> 分离图层
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOriginalImage(null)
                setSeparatedLayers({ original: null, mask: null })
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
            >
              上传新图片
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="relative border rounded-lg overflow-hidden">
                <canvas ref={canvasRef} className="max-w-full h-auto" style={{ display: "block" }} />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 opacity-0 max-w-full h-auto"
                  style={{ display: "block" }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">遮罩透明度: {maskOpacity[0]}%</label>
                </div>
                <Slider value={maskOpacity} min={0} max={100} step={1} onValueChange={setMaskOpacity} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">笔刷大小: {brushSize[0]}px</label>
                </div>
                <Slider value={brushSize} min={1} max={50} step={1} onValueChange={setBrushSize} />
              </div>
            </div>

            {/* 分离结果 */}
            <div>
              {separatedLayers.original && separatedLayers.mask ? (
                <Tabs defaultValue="masked">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="masked">带遮罩图像</TabsTrigger>
                    <TabsTrigger value="original">原始图层</TabsTrigger>
                    <TabsTrigger value="mask">遮罩图层</TabsTrigger>
                  </TabsList>
                  <TabsContent value="masked" className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <img
                        src={canvasRef.current?.toDataURL() || "/placeholder.svg"}
                        alt="Masked Image"
                        className="max-w-full h-auto"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default" size="sm" onClick={saveMaskedImage}>
                        <Download className="mr-2 h-4 w-4" /> 保存带遮罩图像
                      </Button>
                      <Button variant="outline" size="sm" onClick={saveMaskedImageWithTransparency}>
                        <Download className="mr-2 h-4 w-4" /> 保存为透明PNG
                      </Button>
                      <Button variant="outline" size="sm" onClick={saveMaskedImageWithCustomTransparency}>
                        <Download className="mr-2 h-4 w-4" /> 自定义透明度
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="original" className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <img
                        src={separatedLayers.original || "/placeholder.svg"}
                        alt="Original Layer"
                        className="max-w-full h-auto"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadLayer(separatedLayers.original!, "original-layer.png")}
                    >
                      <Download className="mr-2 h-4 w-4" /> 下载原始图层
                    </Button>
                  </TabsContent>
                  <TabsContent value="mask" className="space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={separatedLayers.mask || "/placeholder.svg"}
                        alt="Mask Layer"
                        className="max-w-full h-auto"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadLayer(separatedLayers.mask!, "mask-layer.png")}
                    >
                      <Download className="mr-2 h-4 w-4" /> 下载遮罩图层
                    </Button>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg p-12">
                  <div className="text-center">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">绘制遮罩并点击"分离图层"</h3>
                    <p className="mt-1 text-xs text-gray-500">分离后的图层将显示在这里</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
