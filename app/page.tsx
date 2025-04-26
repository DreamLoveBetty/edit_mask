import { ImageMaskEditor } from "@/components/image-mask-editor"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">图像遮罩分离工具</h1>
      <p className="text-center text-gray-500 mb-10">上传图片，绘制遮罩，然后分离图层</p>

      <div className="max-w-4xl mx-auto">
        <ImageMaskEditor />
      </div>
    </main>
  )
}
