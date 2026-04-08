from abc import ABC, abstractmethod
from pathlib import Path


class BaseEngine(ABC):
    def __init__(self, template_path: Path, output_path: Path):
        self.template_path = template_path
        self.output_path = output_path

    @abstractmethod
    def generate(self, request):
        pass