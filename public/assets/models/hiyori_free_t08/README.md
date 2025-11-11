# Hiyori Free Live2D 模型放置说明

将从官方 Cubism 例程中下载的 `hiyori_free` 模型解压后，按照下列结构复制到当前目录：

```
public/
  assets/
    models/
      hiyori_free_t08/
        hiyori_free_t08.model3.json
        hiyori_free_t08.moc3
        texture_00.png
        hiyori_free_t08.cdi3.json
        hiyori_free_t08.physics3.json
        hiyori_free_t08.pose3.json        # 如果存在
        motions/
          hiyori_m01.motion3.json
          hiyori_m02.motion3.json
          ...
        expressions/
          exp_f01.json                    # 如果存在
          exp_f02.json
          ...
```

> **提示**
> - 可以直接把下载包里的 `runtime/hiyori_free_t08.2048` 文件夹整体复制过来，然后将其重命名为 `public/assets/models/hiyori_free_t08` 即可。
> - 如果模型文件使用了其他命名，请保持 `*.model3.json` 内的相对路径与实际文件名一致。
> - `main.js` 中的 `LIVE2D_MODEL_PATH` 已指向 `assets/models/hiyori_free_t08/hiyori_free_t08.model3.json`，保持该文件存在即可加载模型。
> - 如需更换模型，只需在 `models/` 下创建新的子目录并调整 `LIVE2D_MODEL_PATH`。
