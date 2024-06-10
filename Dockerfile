# Docker image for an HIV-TRACE development environment (Red Hat Universal Base Image 8.10)
FROM redhat/ubi8:8.10

# Set up environment and install dependencies
RUN yum -y update && \
    yum install -y bzip2-devel cmake gcc gcc-c++ gcc-toolset-12 git libcurl-devel openssl-devel python3.11 python3.11-devel python3.11-pip wget xz-devel && \
    echo 'source /opt/rh/gcc-toolset-12/enable' > ~/.bashrc && \
    source ~/.bashrc && \

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

# To compile HIV-TRACE within the development environment:
#   python3 setup.py develop
