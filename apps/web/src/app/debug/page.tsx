"use client";

import Link from "next/link";

export default function DebugPage() {
  const testPages = [
    {
      title: "简单WASM测试",
      description: "测试WASM模块的基本加载和功能",
      href: "/simple-wasm-test",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "完整流程测试",
      description: "测试完整的加密/解密和IPFS上传流程",
      href: "/test-full-flow",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "加密调试工具",
      description: "调试加密算法和参数验证",
      href: "/debug-encryption",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "区块链数据调试",
      description: "调试区块链数据解析和胶囊信息",
      href: "/debug-blockchain",
      color: "bg-orange-500 hover:bg-orange-600",
    },
    {
      title: "WASM功能测试",
      description: "测试WASM加密功能",
      href: "/test-wasm",
      color: "bg-red-500 hover:bg-red-600",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">调试工具集合</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={`${page.color} text-white rounded-lg p-6 block transition-colors`}
          >
            <h2 className="text-xl font-semibold mb-2">{page.title}</h2>
            <p className="text-white/90 text-sm">{page.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">问题排查指南</h2>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-blue-800">WASM加载失败</h3>
            <p className="text-sm text-blue-600 mt-1">
              如果看到"WebAssembly.instantiateStreaming failed"错误：
            </p>
            <ul className="text-sm text-blue-600 mt-1 ml-4 list-disc">
              <li>检查Next.js配置是否正确设置了WASM MIME类型</li>
              <li>确保WASM文件存在于public目录</li>
              <li>重启开发服务器</li>
            </ul>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-medium text-green-800">加密/解密失败</h3>
            <p className="text-sm text-green-600 mt-1">
              如果加密或解密过程失败：
            </p>
            <ul className="text-sm text-green-600 mt-1 ml-4 list-disc">
              <li>检查WASM模块是否正确加载</li>
              <li>验证加密参数（nonce、salt）是否正确</li>
              <li>确保钱包地址、胶囊ID、解锁时间参数一致</li>
            </ul>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h3 className="font-medium text-orange-800">区块链数据问题</h3>
            <p className="text-sm text-orange-600 mt-1">
              如果区块链数据解析失败：
            </p>
            <ul className="text-sm text-orange-600 mt-1 ml-4 list-disc">
              <li>检查智能合约是否正确部署</li>
              <li>验证胶囊创建时是否正确存储了加密参数</li>
              <li>使用区块链调试工具检查原始数据</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-medium text-purple-800">IPFS上传/下载问题</h3>
            <p className="text-sm text-purple-600 mt-1">如果IPFS操作失败：</p>
            <ul className="text-sm text-purple-600 mt-1 ml-4 list-disc">
              <li>检查Pinata API密钥是否正确配置</li>
              <li>验证网络连接</li>
              <li>确保上传的数据格式正确</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          返回主页
        </Link>
      </div>
    </div>
  );
}
