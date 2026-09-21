# Modular Norm RandOpt

Research project page for **Modular Norm RandOpt: Population-Efficient Ensembling through Architecture-Aware Perturbations**.

## ローカルで見る

このディレクトリで実行します。サイトの閲覧にNode.jsやnpm installは不要です。

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

[http://127.0.0.1:8000/](http://127.0.0.1:8000/) を開きます。停止はサーバーを実行しているターミナルで `Ctrl+C`。

## 現在の内容

- Neural ThicketsのScalingセクションを参考にした真っ白（`#ffffff`）の背景・黒文字・グレーの罫線。見出しは小さめの左揃えに統一する。
- Table 1(a)の7タスク・3手法・3モデルサイズを比較するSVGレーダー。タスク別の拡大目盛りを使用し、平均・標本SD・軸の範囲・差分はホバー／タップ／キーボード操作で確認できる。常設の数値・数値表・共通0–100%への切り替えは表示しない。
- 提案手法は青、RandOptはオレンジ、RMSNorm-onlyは紫。輪郭や凡例に触れると同色で面を強調する。初めてスクロールで表示した時に点→線→面の順で現れ、操作した場合や動きを減らす設定では完成した図をすぐに表示する。
- Figure 2を論文と同じ2行×2列で再描画。上段Countdown、下段GSM8K、左列K=10、右列K=25。表示した行から軸→点→線・帯→比較マーカー・注釈の順に現れる。カーソル追従線は付けない。再生ボタン、画面外・非表示時の停止、動きを減らす設定に対応する。
- Iterative ES・ZO-FinetunerとMN RandOptを、Countdown／GSM8Kの2パネルで比較。横軸は本実行のモデル×問題の評価回数、縦軸は精度。MNのK=25の測定点を線で結び、K=1の対照条件も表示する。MeZOの精度は提供論文で未報告のため、点を描かず凡例に明示する。
- 構成はタイトル、独立したOverview、Figure 2、反復手法との比較、Across tasks & scales。Overviewに研究の要点の2文を移し、Method全体は一旦非掲載とする。著者・所属と冒頭のリンクボタンを維持し、ローカルPDFへのリンクはヘッダーに置く。末尾の論文案内・クレジット・仮公開の説明、レーダー下の操作ガイド・結果要約は削除した。以前の候補数比較UI・実行時間・モデル系列の比較表・支持分布の説明と投票デモも表示しない。
- スマートフォン用の図の配置と、JavaScript無効時の静止図・凡例。

HTML・CSS・JavaScript・SVG・JSONのみで構成しています。CDNや実行時の外部リクエスト、ライブラリ依存はありません。InterとJetBrains Monoを `assets/fonts/` から配信し、両方のSIL Open Font Licenseを同梱しています。

## データと図を更新する

レーダーの数値の正は `assets/data/transfer-results.json` です。データを変更したら、Node.jsで静止SVGと凡例も更新します。

```sh
node scripts/build-assets.mjs
```

掲載中の図をまとめて更新する場合は `npm run assets` を実行します。`assets/data/population-comparison.json` は以前の主要数値の根拠として保管しています。

Methodは現在非掲載です。再掲載できるように `scripts/method-section.html`、関連する描画・操作コードとデータは保持しています。実行時には初期化せず、通常の素材生成の対象からも外しています。`build-illustrations.mjs` はページにMethodのマーカーがない場合、そのまま終了します。

Figure 2の入力は、提供された `../figure2.md` 第6節を転記した `assets/data/figure2.csv` です。整数のseed別正答数から40点の平均と標本SDを再計算します。Countdown・MN・N=100・K=25のSDはこの実験の `3.22` であり、アブレーションの `0.87` を流用しません。再生成は `node scripts/build-figure2.mjs` または `npm run assets`。生成する静止版は `assets/figures/figure2.svg`、描画は `figure2-svg.js`、動きは `figure2-chart.js` / `figure2.css` にあります。狭い画面でも2×2の配置を保ち、図の領域だけ横スクロールできます。

## 確認

反復手法の入力は `assets/data/iterative-baselines.json`。Table 3(a)、追加のN=3000・K=25はTable D2、評価予算の式はAppendix D.2に対応します。Countdownの評価は1,500問でFigure 2の500問とは異なるため、両者の数値を混ぜません。MeZOは追加データがない限り `null` を維持します。`node scripts/build-iterative.mjs` はページの図と2つの静止SVGを更新します。

```sh
node scripts/check.mjs
```

63組の値、拡大尺度、欠測値、静止図・凡例との一致、JavaScriptの構文を確認します。隣のディレクトリに提供済みの `main (1).tex` がある場合は、全数値をその表と照合します。

操作処理の検証には、公開対象外の `.local/verification/` にjsdomを入れて実行できます。

```sh
npm install --prefix .local/verification --no-save --package-lock=false --ignore-scripts jsdom
node scripts/check-ui.mjs
node scripts/check-motion.mjs
node scripts/check-figure2.mjs
node scripts/check-iterative.mjs
```

これはDOM上の動作確認です。レーダーの強調・ツールチップ・モデル切り替え・初回表示を検証します。`check-motion.mjs` は実際のページ初期化を通して、Methodなしで各図が表示・再生されること、非表示タブでの停止、動きを減らす設定への対応を確認します。実ブラウザでのレイアウト・操作感の確認とは区別します。

`check-figure2.mjs` は120個のseed別正答数、40点の平均・SD・帯、候補数のカテゴリ軸、比較差、4パネルの配置、表示開始・再生・停止を確認します。隣の `figure2.md` があれば、転記したCSVとの一致も検証します。

`check-iterative.mjs` はTeXのTable 3(a)・D2との照合、最終評価とチェックポイント選択を含む予算計算、未報告値の除外、SVG、ホバー・タップ・キーボード・凡例・再生を確認します。

書体の配布元： [Inter](https://github.com/rsms/inter) ／ [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono)。イラストは独自のSVG／HTMLで、論文Figureの画像は使用していません。

## 公開前に確定する内容

- 著者、著者順、所属、プロフィール、コードURL、正式な論文URL、BibTeX。
- `assets/papers/paper-draft.pdf` は提供PDFのローカル確認用コピーで、Git管理から除外しています。公開前に正式なPDF・リンクへ置き換えます。
- ローカル版には `noindex, nofollow` を設定しています。公開準備時に見直します。
- PC・スマートフォンの実画面を確認し、GitHub Pagesの設定を行います。

**pushはユーザーの最終指示まで行いません。** 詳細は [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) を参照してください。
