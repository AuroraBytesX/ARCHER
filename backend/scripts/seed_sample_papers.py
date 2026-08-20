"""
Seed Sample Academic PDFs for ARCHER Testing
Generates realistic multi-page academic research paper PDFs and provides an automated ingestion helper.
"""

import os
import sys
import pymupdf

# Sample research papers definitions
SAMPLE_PAPERS = [
    {
        "filename": "Attention_Is_All_You_Need.pdf",
        "title": "Attention Is All You Need",
        "authors": "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin",
        "year": 2017,
        "doi": "10.48550/arXiv.1706.03762",
        "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
        "sections": [
            ("Introduction", "Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Recurrent models typically factor computation along the symbol positions of the input and output sequences. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths."),
            ("Methodology", "The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key. Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions."),
            ("Experiments & Evaluation", "We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs. Sentences were encoded using byte-pair encoding. For English-French, we used the significantly larger WMT 2014 English-French dataset consisting of 36M sentences. On the WMT 2014 English-to-German translation task, the big transformer model achieves a state-of-the-art BLEU score of 28.4."),
            ("Results & Discussion", "The Transformer achieves state-of-the-art translation quality while being more parallelizable and requiring significantly less time to train. Table 2 summarizes our results. On the English-to-German task, our model outperforms the previously best reported results (including ensembles) by more than 2.0 BLEU. Training took 3.5 days on 8 P100 GPUs."),
            ("Limitations", "While the Transformer eliminates recurrence, self-attention exhibits quadratic computational and memory complexity O(N^2) with respect to sequence length N. This poses significant challenges when processing long context documents, high-resolution imagery, or audio sequences without sparse or hierarchical approximations."),
            ("Conclusion & Future Work", "In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention. We plan to extend the Transformer to problems involving input and output modalities other than text.")
        ]
    },
    {
        "filename": "BERT_Pretraining_of_Deep_Bidirectional_Transformers.pdf",
        "title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
        "authors": "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova",
        "year": 2018,
        "doi": "10.48550/arXiv.1810.04805",
        "abstract": "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
        "sections": [
            ("Introduction", "Language model pre-training has been shown to be effective for improving many natural language processing tasks. These include low-level tasks such as natural language inference and paraphrasing, as well as token-level tasks such as named entity recognition and question answering. There are two existing strategies for applying pre-trained language representations to downstream tasks: feature-based and fine-tuning."),
            ("Methodology", "There are two steps in our framework: pre-training and fine-tuning. During pre-training, the model is trained on unlabeled data over two self-supervised tasks: Masked Language Model (MLM) and Next Sentence Prediction (NSP). For MLM, we mask 15% of the input tokens at random and predict the masked tokens. For fine-tuning, the BERT model is first initialized with the pre-trained parameters, and all parameters are fine-tuned using labeled data from downstream tasks."),
            ("Experiments & Evaluation", "BERT is evaluated on 11 natural language processing benchmarks, including the General Language Understanding Evaluation (GLUE) benchmark, Stanford Question Answering Dataset (SQuAD v1.1 and v2.0), and Situations With Adversarial Generations (SWAG). BERT_BASE has 12 layers, 768 hidden units, and 110M parameters. BERT_LARGE has 24 layers, 1024 hidden units, and 340M parameters."),
            ("Results & Discussion", "BERT achieves state-of-the-art results on all 11 NLP tasks. On GLUE, BERT_LARGE obtains an average score of 82.1%, representing a 7.7% absolute improvement over previous state of the art. On SQuAD v1.1, BERT achieves 93.2% F1 score, outperforming human performance."),
            ("Limitations", "The pre-training objective of Masked LM creates a discrepancy between pre-training and fine-tuning, as the [MASK] token never appears during inference. Additionally, fine-tuning large models requires substantial GPU compute and exhibits instability across random seeds on small target datasets."),
            ("Conclusion & Future Work", "Recent empirical improvements due to transfer learning with language models have demonstrated that rich, unsupervised pre-training is an integral part of many language understanding systems. Our major contribution is further generalizing these findings to deep bidirectional architectures.")
        ]
    },
    {
        "filename": "LoRA_Low_Rank_Adaptation_of_Large_Language_Models.pdf",
        "title": "LoRA: Low-Rank Adaptation of Large Language Models",
        "authors": "Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, Weizhu Chen",
        "year": 2021,
        "doi": "10.48550/arXiv.2106.09685",
        "abstract": "An important paradigm of natural language processing consists of large-scale pre-training on general domain data and adaptation to specific tasks. As models grow larger, full fine-tuning becomes prohibitive. We propose Low-Rank Adaptation (LoRA), which freezes the pre-trained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture.",
        "sections": [
            ("Introduction", "Many applications in natural language processing rely on adapting one large, pre-trained language model to multiple downstream applications. In full fine-tuning, all model parameters are updated, creating a distinct copy of the model for every task. For a 175B GPT-3 model, storing and deploying fine-tuned models is extraordinarily expensive."),
            ("Methodology", "We propose Low-Rank Adaptation (LoRA). We hypothesize that the parameter updates Delta_W during task adaptation have a low 'intrinsic dimension'. For a pre-trained weight matrix W_0 in R^{d x k}, we constrain its update by representing Delta_W = B * A, where B in R^{d x r} and A in R^{r x k}, with rank r << min(d, k). During training, W_0 is frozen and does not receive gradient updates, while A and B contain trainable parameters."),
            ("Experiments & Evaluation", "We evaluate LoRA on RoBERTa, DeBERTa, and GPT-2, scaling up to GPT-3 175B. Tasks include GLUE benchmark, E2E NLG Challenge, and WebNLG. We set rank r to 4 or 8 across self-attention projection weights."),
            ("Results & Discussion", "LoRA can reduce the number of trainable parameters by 10,000 times and GPU memory consumption by 3 times compared to full fine-tuning. LoRA performs on par or better than full fine-tuning on GLUE with RoBERTa and GPT-3 175B, while introducing zero additional inference latency."),
            ("Limitations", "LoRA is primarily evaluated on text-to-text generative and classification benchmarks. It does not compress the underlying pre-trained base model weights in memory during inference if serving multiple distinct base models concurrently."),
            ("Conclusion & Future Work", "LoRA provides a parameter-efficient, modular adaptation framework for foundation models. Future work includes investigating combinations of LoRA with quantization (QLoRA) and dynamic rank allocation.")
        ]
    },
    {
        "filename": "Retrieval_Augmented_Generation_for_Knowledge_Intensive_NLP.pdf",
        "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        "authors": "Patrick Lewis, Ethan Perez, Aleksandera Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Kuttler, Mike Lewis, Wen-tau Yih, Tim Rocktaschel, Sebastian Riedel, Douwe Kiela",
        "year": 2020,
        "doi": "10.48550/arXiv.2005.11401",
        "abstract": "Large pre-trained language models have been shown to store factual knowledge in their parameters. However, their ability to access and precisely manipulate knowledge is still limited. We build Retrieval-Augmented Generation (RAG) models where the parametric memory is a pre-trained seq2seq model and the non-parametric memory is a dense vector index of Wikipedia, accessed with a pre-trained neural retriever.",
        "sections": [
            ("Introduction", "Pre-trained neural language models learn a substantial amount of in-depth knowledge from data. However, they have drawbacks: they cannot easily expand or revise their memory, they can struggle to provide insights into their decisions, and they frequently produce hallucinations when generating factual statements."),
            ("Methodology", "We introduce RAG models, which combine parametric and non-parametric memory. Our non-parametric component is a Dense Passage Retriever (DPR) querying a vector index of Wikipedia with 21M documents. The parametric component is BART-large (400M parameters). We evaluate two models: RAG-Sequence (which uses the same retrieved document to generate the entire sequence) and RAG-Token (which can use different retrieved documents for each token)."),
            ("Experiments & Evaluation", "We test on four open-domain Question Answering datasets: Natural Questions (NQ), TriviaQA, WebQuestions (WQ), and CuratedTREC, as well as Jeopardy question generation and MS-MARCO."),
            ("Results & Discussion", "RAG models set new state-of-the-art results on open-domain QA benchmarks, outperforming parametric-only models like T5 11B while using significantly fewer parameters. In human evaluations on factuality and specificity, RAG generations are rated as more factual than pure parametric baselines."),
            ("Limitations", "RAG performance is fundamentally bounded by retriever recall. If relevant context is not retrieved in the top-K candidates, the generator may default to hallucinations or parametric uncertainty. Furthermore, dense retrieval across millions of passages incurs indexing and latency overheads."),
            ("Conclusion & Future Work", "We have presented RAG models that fuse parametric generative capabilities with non-parametric vector retrieval. We demonstrate strong empirical benefits across diverse knowledge-intensive benchmarks.")
        ]
    }
]

import zipfile

def generate_pdf(paper: dict, output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, paper["filename"])
    
    doc = pymupdf.open()
    
    # Page 1: Title, Authors, Abstract, Introduction
    page1 = doc.new_page(width=595, height=842) # A4
    
    # Title
    rect_title = pymupdf.Rect(50, 50, 545, 110)
    page1.insert_textbox(rect_title, paper["title"], fontsize=16, fontname="helv", color=(0.05, 0.1, 0.2))
    
    # Authors
    rect_authors = pymupdf.Rect(50, 115, 545, 145)
    page1.insert_textbox(rect_authors, paper["authors"], fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    
    # Year & DOI
    rect_meta = pymupdf.Rect(50, 150, 545, 170)
    meta_text = f"Published: {paper['year']}  |  DOI: {paper['doi']}"
    page1.insert_textbox(rect_meta, meta_text, fontsize=8, fontname="helv", color=(0.1, 0.5, 0.4))
    
    # Abstract
    rect_abstract_hdr = pymupdf.Rect(50, 180, 545, 195)
    page1.insert_textbox(rect_abstract_hdr, "Abstract", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    
    rect_abstract = pymupdf.Rect(50, 200, 545, 290)
    page1.insert_textbox(rect_abstract, paper["abstract"], fontsize=9.5, fontname="times-roman", color=(0.15, 0.15, 0.15))
    
    # First 2 sections on Page 1
    y = 305
    for sec_name, sec_content in paper["sections"][:2]:
        rect_hdr = pymupdf.Rect(50, y, 545, y + 20)
        page1.insert_textbox(rect_hdr, sec_name, fontsize=11, fontname="helv", color=(0.05, 0.1, 0.2))
        y += 22
        rect_body = pymupdf.Rect(50, y, 545, y + 180)
        page1.insert_textbox(rect_body, sec_content, fontsize=9.5, fontname="times-roman", color=(0.2, 0.2, 0.2))
        y += 195

    # Page 2: Remaining sections (Experiments, Results, Limitations, Conclusion)
    page2 = doc.new_page(width=595, height=842)
    
    # Header
    page2.insert_textbox(pymupdf.Rect(50, 40, 545, 60), f"{paper['title']} - Page 2", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))
    
    y = 70
    for sec_name, sec_content in paper["sections"][2:]:
        rect_hdr = pymupdf.Rect(50, y, 545, y + 20)
        page2.insert_textbox(rect_hdr, sec_name, fontsize=11, fontname="helv", color=(0.05, 0.1, 0.2))
        y += 22
        rect_body = pymupdf.Rect(50, y, 545, y + 130)
        page2.insert_textbox(rect_body, sec_content, fontsize=9.5, fontname="times-roman", color=(0.2, 0.2, 0.2))
        y += 145

    doc.save(file_path)
    doc.close()
    return file_path

def create_sample_zip(pdf_paths: list, output_zip_path: str):
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for p in pdf_paths:
            zipf.write(p, arcname=os.path.basename(p))

def main():
    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../sample_papers"))
    print(f"Generating realistic sample academic research paper PDFs in: {sample_dir}")
    
    created_paths = []
    for p in SAMPLE_PAPERS:
        path = generate_pdf(p, sample_dir)
        print(f"  Created: {p['filename']} (Pages: 2)")
        created_paths.append(path)
        
    zip_path = os.path.join(sample_dir, "sample_papers.zip")
    create_sample_zip(created_paths, zip_path)
    print(f"  Created test archive: sample_papers.zip")
        
    print(f"\nSuccessfully created {len(created_paths)} sample research paper PDFs and sample_papers.zip.")
    print("You can now:")
    print("  1. Open http://localhost:5173/upload and drag & drop these PDFs or the ZIP file to test the UI.")
    print("  2. Or test multi-paper comparison at http://localhost:5173/compare")
    print(f"  Folder location: {sample_dir}")

if __name__ == "__main__":
    main()


