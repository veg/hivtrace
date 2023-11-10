# Docker image for HIV-TRACE
FROM ubuntu:20.04

# Set up environment and install dependencies
RUN apt-get update && apt-get -y upgrade && \
    DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get install -y cmake gcc g++ git libcurl4-openssl-dev libssl-dev make python3 python3-pip wget && \

    # Update pip and use it to install Python packages
    python3 -m pip install --upgrade pip && \
    pip3 install biopython cython numpy scipy && \

    # Install tn93
    wget -qO- "https://github.com/veg/tn93/archive/refs/tags/v.1.0.11.tar.gz" | tar -zx && \
    cd tn93-* && \
    cmake . && \
    make install && \
    cd .. && \
    rm -rf tn93-* && \

    # Clean up
    rm -rf ~/.cache /tmp/* ~/.wget-hsts
